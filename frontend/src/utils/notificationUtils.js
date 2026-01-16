// Notification utilities for bus tracking system

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show a browser notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 */
export const showNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/bus-icon.png', // You can add a bus icon
      badge: '/bus-badge.png',
      ...options
    });

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }
};

/**
 * Show bus arrival notification
 * @param {Object} bus - Bus object
 * @param {Object} stop - Stop object
 * @param {number} distance - Distance in km
 * @param {number} eta - ETA in minutes
 */
export const showBusArrivalNotification = (bus, stop, distance, eta) => {
  const title = `Bus ${bus.busNumber} Approaching`;
  const body = `Route: ${bus.route.routeName}\nStop: ${stop.stopName}\n${eta < 1 ? 'Arriving now!' : `${eta} min away`}`;

  showNotification(title, {
    body,
    tag: `bus-${bus._id}-stop-${stop._id}`,
    requireInteraction: eta < 5, // Keep notification visible if bus is very close
    actions: eta < 5 ? [
      { action: 'view', title: 'View on Map' }
    ] : []
  });
};

/**
 * Show bus departure notification
 * @param {Object} bus - Bus object
 * @param {Object} stop - Stop object
 */
export const showBusDepartureNotification = (bus, stop) => {
  const title = `Bus ${bus.busNumber} Departed`;
  const body = `Route: ${bus.route.routeName}\nFrom: ${stop.stopName}`;

  showNotification(title, {
    body,
    tag: `bus-${bus._id}-departure`,
    icon: '/bus-departed.png'
  });
};

/**
 * Show route change notification
 * @param {Object} bus - Bus object
 * @param {string} changeType - Type of change ('delay', 'route_change', 'cancelled')
 * @param {string} message - Custom message
 */
export const showRouteChangeNotification = (bus, changeType, message) => {
  const titles = {
    delay: 'Bus Delay',
    route_change: 'Route Change',
    cancelled: 'Bus Cancelled',
    maintenance: 'Bus Under Maintenance'
  };

  const title = titles[changeType] || 'Bus Update';
  const body = `Bus ${bus.busNumber} - ${bus.route.routeName}\n${message}`;

  showNotification(title, {
    body,
    tag: `bus-${bus._id}-${changeType}`,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Details' }
    ]
  });
};

/**
 * Check if user is tracking a bus and show relevant notifications
 * @param {Array} trackedBuses - Array of tracked bus objects
 * @param {Object} busUpdate - Bus location update data
 * @param {Array} stops - Array of all stops
 */
export const checkAndNotifyBusUpdates = (trackedBuses, busUpdate, stops) => {
  const trackedBus = trackedBuses.find(bus => bus._id === busUpdate.busId);
  if (!trackedBus) return;

  // Find nearest stop
  const nearestStop = stops.reduce((nearest, stop) => {
    const distance = calculateDistance(busUpdate.location, stop.location);
    return !nearest || distance < nearest.distance ? { ...stop, distance } : nearest;
  }, null);

  if (nearestStop && nearestStop.distance <= 0.5) { // Within 500m
    const eta = Math.round((nearestStop.distance / 30) * 60); // Assuming 30 km/h average speed
    showBusArrivalNotification(trackedBus, nearestStop, nearestStop.distance, eta);
  }
};

/**
 * Calculate distance (helper function for notifications)
 * @param {Object} point1 - {latitude, longitude}
 * @param {Object} point2 - {latitude, longitude}
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = Math.toRadians(point2.latitude - point1.latitude);
  const dLon = Math.toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Math.toRadians(point1.latitude)) * Math.cos(Math.toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians (helper function)
 * @param {number} degrees
 * @returns {number} Radians
 */
Math.toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};
