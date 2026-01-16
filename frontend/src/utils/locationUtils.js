// Location utilities for bus tracking system

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} point1 - {latitude, longitude}
 * @param {Object} point2 - {latitude, longitude}
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
export const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate estimated time of arrival based on distance and average speed
 * @param {Object} currentLocation - {latitude, longitude}
 * @param {Object} destination - {latitude, longitude}
 * @param {number} averageSpeed - Average speed in km/h (default: 30 km/h for city buses)
 * @returns {Object} {distance, eta, etaText}
 */
export const calculateETA = (currentLocation, destination, averageSpeed = 30) => {
  const distance = calculateDistance(currentLocation, destination);
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);

  let etaText;
  if (timeInMinutes < 1) {
    etaText = 'Arriving now';
  } else if (timeInMinutes === 1) {
    etaText = '1 min';
  } else if (timeInMinutes < 60) {
    etaText = `${timeInMinutes} mins`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const mins = timeInMinutes % 60;
    etaText = `${hours}h ${mins}m`;
  }

  return {
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
    eta: timeInMinutes,
    etaText
  };
};

/**
 * Find the nearest bus stop from a given location
 * @param {Object} location - {latitude, longitude}
 * @param {Array} stops - Array of stop objects with location
 * @returns {Object} Nearest stop with distance
 */
export const findNearestStop = (location, stops) => {
  if (!stops || stops.length === 0) return null;

  let nearestStop = stops[0];
  let minDistance = calculateDistance(location, stops[0].location);

  for (let i = 1; i < stops.length; i++) {
    const distance = calculateDistance(location, stops[i].location);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStop = stops[i];
    }
  }

  return {
    ...nearestStop,
    distance: Math.round(minDistance * 100) / 100
  };
};

/**
 * Calculate bearing between two points (direction)
 * @param {Object} point1 - {latitude, longitude}
 * @param {Object} point2 - {latitude, longitude}
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (point1, point2) => {
  const dLon = toRadians(point2.longitude - point1.longitude);
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = Math.atan2(y, x);
  bearing = toDegrees(bearing);
  bearing = (bearing + 360) % 360;

  return bearing;
};

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number} Degrees
 */
export const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Check if a point is within a certain radius of another point
 * @param {Object} point1 - {latitude, longitude}
 * @param {Object} point2 - {latitude, longitude}
 * @param {number} radiusInKm - Radius in kilometers
 * @returns {boolean}
 */
export const isWithinRadius = (point1, point2, radiusInKm) => {
  const distance = calculateDistance(point1, point2);
  return distance <= radiusInKm;
};

/**
 * Get direction name from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Direction name
 */
export const getDirectionFromBearing = (bearing) => {
  const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

/**
 * Check if a bus is approaching a stop (geofencing)
 * @param {Object} busLocation - {latitude, longitude}
 * @param {Array} stops - Array of stop objects with location
 * @param {number} radiusInKm - Detection radius in kilometers (default: 0.5km)
 * @returns {Object|null} Nearest stop if within radius, null otherwise
 */
export const checkBusApproachingStop = (busLocation, stops, radiusInKm = 0.5) => {
  if (!stops || stops.length === 0) return null;

  for (const stop of stops) {
    const distance = calculateDistance(busLocation, stop.location);
    if (distance <= radiusInKm) {
      return {
        stop,
        distance,
        isApproaching: distance <= radiusInKm
      };
    }
  }

  return null;
};

/**
 * Get stops along a route
 * @param {Object} route - Route object with waypoints
 * @param {Array} allStops - All available stops
 * @param {number} toleranceInKm - Distance tolerance for matching stops to route
 * @returns {Array} Stops that are along the route
 */
export const getStopsAlongRoute = (route, allStops, toleranceInKm = 0.2) => {
  if (!route || !allStops) return [];

  const routePoints = [
    route.startPoint,
    ...(route.waypoints || []),
    route.endPoint
  ];

  const stopsAlongRoute = [];

  for (const stop of allStops) {
    // Check if stop is near any point on the route
    for (const routePoint of routePoints) {
      const distance = calculateDistance(stop.location, routePoint);
      if (distance <= toleranceInKm) {
        stopsAlongRoute.push({
          ...stop,
          distanceFromRoute: distance,
          nearestRoutePoint: routePoint
        });
        break; // Stop checking other points once we find a match
      }
    }
  }

  // Sort stops by their position along the route
  return stopsAlongRoute.sort((a, b) => {
    // Simple sorting based on latitude (north-south)
    return a.location.latitude - b.location.latitude;
  });
};

/**
 * Calculate estimated arrival time at next stop
 * @param {Object} currentLocation - {latitude, longitude}
 * @param {Object} nextStop - Stop object with location
 * @param {number} currentSpeed - Current speed in km/h
 * @returns {Object} ETA information
 */
export const calculateStopETA = (currentLocation, nextStop, currentSpeed = 30) => {
  const distance = calculateDistance(currentLocation, nextStop.location);
  const timeInHours = distance / Math.max(currentSpeed, 5); // Minimum 5 km/h
  const timeInMinutes = Math.round(timeInHours * 60);

  return {
    stop: nextStop,
    distance,
    eta: timeInMinutes,
    etaText: timeInMinutes < 1 ? 'Arriving now' :
             timeInMinutes === 1 ? '1 min' :
             timeInMinutes < 60 ? `${timeInMinutes} mins` :
             `${Math.floor(timeInMinutes / 60)}h ${timeInMinutes % 60}m`
  };
};
