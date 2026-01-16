import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DirectionsBus,
  Route,
  LocationOn
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api.js';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();

  // ALL hooks must be called before any early returns
  const [tabValue, setTabValue] = useState(0);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [busDialog, setBusDialog] = useState({ open: false, bus: null });
  const [routeDialog, setRouteDialog] = useState({ open: false, route: null });
  const [stopDialog, setStopDialog] = useState({ open: false, stop: null });

  // Form states
  const [busForm, setBusForm] = useState({
    busNumber: '',
    route: '',
    currentLocation: { latitude: '', longitude: '' }
  });
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    startPoint: { name: '', latitude: '', longitude: '' },
    endPoint: { name: '', latitude: '', longitude: '' },
    waypoints: [],
    distance: '',
    estimatedDuration: ''
  });
  const [stopForm, setStopForm] = useState({
    stopName: '',
    location: { latitude: '', longitude: '' },
    address: ''
  });
  const [waypointForm, setWaypointForm] = useState({
    name: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  // Redirect if not authenticated or not admin
  if (!authLoading && (!user || user.role !== 'admin')) {
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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Bus handlers
  const handleBusDialog = (bus = null) => {
    if (bus) {
      setBusForm({
        busNumber: bus.busNumber,
        route: bus.route._id,
        currentLocation: bus.currentLocation
      });
    } else {
      setBusForm({
        busNumber: '',
        route: '',
        currentLocation: { latitude: '', longitude: '' }
      });
    }
    setBusDialog({ open: true, bus });
  };

  const handleBusSubmit = async () => {
    try {
      const data = {
        ...busForm,
        currentLocation: {
          latitude: parseFloat(busForm.currentLocation.latitude),
          longitude: parseFloat(busForm.currentLocation.longitude)
        }
      };

      if (busDialog.bus) {
        await api.put(`/buses/${busDialog.bus._id}`, data);
        toast.success('Bus updated successfully');
      } else {
        await api.post('/buses', data);
        toast.success('Bus created successfully');
      }

      setBusDialog({ open: false, bus: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleBusDelete = async (busId) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      try {
        await api.delete(`/buses/${busId}`);
        toast.success('Bus deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete bus');
      }
    }
  };

  // Route handlers
  const handleRouteDialog = (route = null) => {
    if (route) {
      setRouteForm({
        routeName: route.routeName,
        startPoint: route.startPoint,
        endPoint: route.endPoint,
        waypoints: route.waypoints || [],
        distance: route.distance,
        estimatedDuration: route.estimatedDuration
      });
    } else {
      setRouteForm({
        routeName: '',
        startPoint: { name: '', latitude: '', longitude: '' },
        endPoint: { name: '', latitude: '', longitude: '' },
        waypoints: [],
        distance: '',
        estimatedDuration: ''
      });
    }
    setRouteDialog({ open: true, route });
  };

  const handleRouteSubmit = async () => {
    try {
      const data = {
        ...routeForm,
        distance: parseFloat(routeForm.distance),
        estimatedDuration: parseInt(routeForm.estimatedDuration)
      };

      if (routeDialog.route) {
        await api.put(`/routes/${routeDialog.route._id}`, data);
        toast.success('Route updated successfully');
      } else {
        await api.post('/routes', data);
        toast.success('Route created successfully');
      }

      setRouteDialog({ open: false, route: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleRouteDelete = async (routeId) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await api.delete(`/routes/${routeId}`);
        toast.success('Route deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete route');
      }
    }
  };

  // Stop handlers
  const handleStopDialog = (stop = null) => {
    if (stop) {
      setStopForm({
        stopName: stop.stopName,
        location: stop.location,
        address: stop.address
      });
    } else {
      setStopForm({
        stopName: '',
        location: { latitude: '', longitude: '' },
        address: ''
      });
    }
    setStopDialog({ open: true, stop });
  };

  const handleStopSubmit = async () => {
    try {
      const data = {
        ...stopForm,
        location: {
          latitude: parseFloat(stopForm.location.latitude),
          longitude: parseFloat(stopForm.location.longitude)
        }
      };

      if (stopDialog.stop) {
        await api.put(`/stops/${stopDialog.stop._id}`, data);
        toast.success('Stop updated successfully');
      } else {
        await api.post('/stops', data);
        toast.success('Stop created successfully');
      }

      setStopDialog({ open: false, stop: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleStopDelete = async (stopId) => {
    if (window.confirm('Are you sure you want to delete this stop?')) {
      try {
        await api.delete(`/stops/${stopId}`);
        toast.success('Stop deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete stop');
      }
    }
  };

  if (authLoading || loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
          <Tab icon={<DirectionsBus />} label="Buses" />
          <Tab icon={<Route />} label="Routes" />
          <Tab icon={<LocationOn />} label="Stops" />
        </Tabs>
      </Paper>

      {/* Buses Tab */}
      {tabValue === 0 && (
        <Paper>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Bus Management</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleBusDialog()}
            >
              Add Bus
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bus Number</TableCell>
                  <TableCell>Route</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {buses.map((bus) => (
                  <TableRow key={bus._id}>
                    <TableCell>{bus.busNumber}</TableCell>
                    <TableCell>{bus.route.routeName}</TableCell>
                    <TableCell>
                      <Chip
                        label={bus.status}
                        color={bus.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {bus.currentLocation
                        ? `${bus.currentLocation.latitude.toFixed(4)}, ${bus.currentLocation.longitude.toFixed(4)}`
                        : 'Not set'
                      }
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleBusDialog(bus)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleBusDelete(bus._id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Routes Tab */}
      {tabValue === 1 && (
        <Paper>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Route Management</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleRouteDialog()}
            >
              Add Route
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Route Name</TableCell>
                  <TableCell>Start Point</TableCell>
                  <TableCell>End Point</TableCell>
                  <TableCell>Waypoints</TableCell>
                  <TableCell>Distance (km)</TableCell>
                  <TableCell>Duration (min)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route._id}>
                    <TableCell>{route.routeName}</TableCell>
                    <TableCell>{route.startPoint.name}</TableCell>
                    <TableCell>{route.endPoint.name}</TableCell>
                    <TableCell>{route.waypoints ? route.waypoints.length : 0} waypoints</TableCell>
                    <TableCell>{route.distance}</TableCell>
                    <TableCell>{route.estimatedDuration}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleRouteDialog(route)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleRouteDelete(route._id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Stops Tab */}
      {tabValue === 2 && (
        <Paper>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Stop Management</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleStopDialog()}
            >
              Add Stop
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Stop Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stops.map((stop) => (
                  <TableRow key={stop._id}>
                    <TableCell>{stop.stopName}</TableCell>
                    <TableCell>
                      {stop.location.latitude.toFixed(4)}, {stop.location.longitude.toFixed(4)}
                    </TableCell>
                    <TableCell>{stop.address || 'N/A'}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleStopDialog(stop)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleStopDelete(stop._id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Bus Dialog */}
      <Dialog open={busDialog.open} onClose={() => setBusDialog({ open: false, bus: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{busDialog.bus ? 'Edit Bus' : 'Add Bus'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bus Number"
            fullWidth
            value={busForm.busNumber}
            onChange={(e) => setBusForm({ ...busForm, busNumber: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Route</InputLabel>
            <Select
              value={busForm.route}
              label="Route"
              onChange={(e) => setBusForm({ ...busForm, route: e.target.value })}
            >
              {routes.map((route) => (
                <MenuItem key={route._id} value={route._id}>
                  {route.routeName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Latitude"
            fullWidth
            type="number"
            value={busForm.currentLocation.latitude}
            onChange={(e) => setBusForm({
              ...busForm,
              currentLocation: { ...busForm.currentLocation, latitude: e.target.value }
            })}
          />
          <TextField
            margin="dense"
            label="Longitude"
            fullWidth
            type="number"
            value={busForm.currentLocation.longitude}
            onChange={(e) => setBusForm({
              ...busForm,
              currentLocation: { ...busForm.currentLocation, longitude: e.target.value }
            })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBusDialog({ open: false, bus: null })}>Cancel</Button>
          <Button onClick={handleBusSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Route Dialog */}
      <Dialog open={routeDialog.open} onClose={() => setRouteDialog({ open: false, route: null })} maxWidth="md" fullWidth>
        <DialogTitle>{routeDialog.route ? 'Edit Route' : 'Add Route'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Route Name"
            fullWidth
            value={routeForm.routeName}
            onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Start Point Name"
              fullWidth
              value={routeForm.startPoint.name}
              onChange={(e) => setRouteForm({
                ...routeForm,
                startPoint: { ...routeForm.startPoint, name: e.target.value }
              })}
            />
            <TextField
              label="Start Latitude"
              fullWidth
              type="number"
              value={routeForm.startPoint.latitude}
              onChange={(e) => setRouteForm({
                ...routeForm,
                startPoint: { ...routeForm.startPoint, latitude: e.target.value }
              })}
            />
            <TextField
              label="Start Longitude"
              fullWidth
              type="number"
              value={routeForm.startPoint.longitude}
              onChange={(e) => setRouteForm({
                ...routeForm,
                startPoint: { ...routeForm.startPoint, longitude: e.target.value }
              })}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="End Point Name"
              fullWidth
              value={routeForm.endPoint.name}
              onChange={(e) => setRouteForm({
                ...routeForm,
                endPoint: { ...routeForm.endPoint, name: e.target.value }
              })}
            />
            <TextField
              label="End Latitude"
              fullWidth
              type="number"
              value={routeForm.endPoint.latitude}
              onChange={(e) => setRouteForm({
                ...routeForm,
                endPoint: { ...routeForm.endPoint, latitude: e.target.value }
              })}
            />
            <TextField
              label="End Longitude"
              fullWidth
              type="number"
              value={routeForm.endPoint.longitude}
              onChange={(e) => setRouteForm({
                ...routeForm,
                endPoint: { ...routeForm.endPoint, longitude: e.target.value }
              })}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Distance (km)"
              fullWidth
              type="number"
              value={routeForm.distance}
              onChange={(e) => setRouteForm({ ...routeForm, distance: e.target.value })}
            />
            <TextField
              label="Estimated Duration (minutes)"
              fullWidth
              type="number"
              value={routeForm.estimatedDuration}
              onChange={(e) => setRouteForm({ ...routeForm, estimatedDuration: e.target.value })}
            />
          </Box>

          {/* Waypoints Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Route Waypoints
          </Typography>

          {/* Add Waypoint Form */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Waypoint Name"
              value={waypointForm.name}
              onChange={(e) => setWaypointForm({ ...waypointForm, name: e.target.value })}
            />
            <TextField
              size="small"
              label="Latitude"
              type="number"
              value={waypointForm.latitude}
              onChange={(e) => setWaypointForm({ ...waypointForm, latitude: e.target.value })}
            />
            <TextField
              size="small"
              label="Longitude"
              type="number"
              value={waypointForm.longitude}
              onChange={(e) => setWaypointForm({ ...waypointForm, longitude: e.target.value })}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                if (waypointForm.name && waypointForm.latitude && waypointForm.longitude) {
                  setRouteForm({
                    ...routeForm,
                    waypoints: [...routeForm.waypoints, {
                      name: waypointForm.name,
                      latitude: parseFloat(waypointForm.latitude),
                      longitude: parseFloat(waypointForm.longitude),
                      order: routeForm.waypoints.length
                    }]
                  });
                  setWaypointForm({ name: '', latitude: '', longitude: '' });
                }
              }}
            >
              Add Waypoint
            </Button>
          </Box>

          {/* Waypoints List */}
          {routeForm.waypoints.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Waypoints:
              </Typography>
              {routeForm.waypoints.map((waypoint, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    label={`${waypoint.name} (${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)})`}
                    size="small"
                    onDelete={() => {
                      setRouteForm({
                        ...routeForm,
                        waypoints: routeForm.waypoints.filter((_, i) => i !== index)
                      });
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRouteDialog({ open: false, route: null })}>Cancel</Button>
          <Button onClick={handleRouteSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Stop Dialog */}
      <Dialog open={stopDialog.open} onClose={() => setStopDialog({ open: false, stop: null })} maxWidth="sm" fullWidth>
        <DialogTitle>{stopDialog.stop ? 'Edit Stop' : 'Add Stop'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Stop Name"
            fullWidth
            value={stopForm.stopName}
            onChange={(e) => setStopForm({ ...stopForm, stopName: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Latitude"
            fullWidth
            type="number"
            value={stopForm.location.latitude}
            onChange={(e) => setStopForm({
              ...stopForm,
              location: { ...stopForm.location, latitude: e.target.value }
            })}
          />
          <TextField
            margin="dense"
            label="Longitude"
            fullWidth
            type="number"
            value={stopForm.location.longitude}
            onChange={(e) => setStopForm({
              ...stopForm,
              location: { ...stopForm.location, longitude: e.target.value }
            })}
          />
          <TextField
            margin="dense"
            label="Address (Optional)"
            fullWidth
            multiline
            rows={2}
            value={stopForm.address}
            onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopDialog({ open: false, stop: null })}>Cancel</Button>
          <Button onClick={handleStopSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
