import axios from 'axios';

const API_BASE = '/api';

export const calculateRouteApi = async (source, destination, stops = []) => {
  const response = await axios.post(`${API_BASE}/routes/calculate`, {
    source: { latitude: parseFloat(source.latitude), longitude: parseFloat(source.longitude) },
    destination: { latitude: parseFloat(destination.latitude), longitude: parseFloat(destination.longitude) },
    stops: stops.map(s => ({ latitude: parseFloat(s.latitude), longitude: parseFloat(s.longitude) })),
    source_name: source.name || "Source",
    destination_name: destination.name || "Destination"
  });
  return response.data;
};

export const rerouteMidDriveApi = async (routeId, currentLocation, destination, affectedRoadId = "R102") => {
  const response = await axios.post(`${API_BASE}/routes/${routeId || 1}/reroute`, {
    current_location: { latitude: parseFloat(currentLocation.latitude), longitude: parseFloat(currentLocation.longitude) },
    destination: destination ? { latitude: parseFloat(destination.latitude), longitude: parseFloat(destination.longitude) } : null,
    affected_road_id: affectedRoadId
  });
  return response.data;
};

export const createIncidentApi = async (lat, lng, roadId = "R102", type = "Accident", severity = "SEVERE") => {
  const response = await axios.post(`${API_BASE}/incidents`, {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    road_id: roadId,
    type,
    severity,
    description: `Simulated ${type} on route segment ${roadId}`
  });
  return response.data;
};

export const clearAllIncidentsApi = async () => {
  const response = await axios.delete(`${API_BASE}/incidents/clear/all`);
  return response.data;
};

export const getWeatherApi = async (lat, lng) => {
  const response = await axios.get(`${API_BASE}/weather`, { params: { lat, lng } });
  return response.data;
};

export const getTrafficApi = async (roadId, lat, lng) => {
  const response = await axios.get(`${API_BASE}/traffic`, { params: { road_id: roadId, lat, lng } });
  return response.data;
};

export const searchLocationNominatim = async (query) => {
  if (!query || query.trim().length < 2) return [];
  try {
    let searchQuery = query;
    if (!query.toLowerCase().includes('bengaluru') && !query.toLowerCase().includes('bangalore')) {
      searchQuery = `${query}, Bengaluru, Karnataka`;
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6`;
    const res = await axios.get(url);
    if (res.data && res.data.length > 0) {
      return res.data.map(item => ({
        name: item.display_name,
        shortName: item.display_name.split(',')[0],
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }));
    }
    // Fallback search without query suffix if no results found
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`;
    const fallbackRes = await axios.get(fallbackUrl);
    return fallbackRes.data.map(item => ({
      name: item.display_name,
      shortName: item.display_name.split(',')[0],
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));
  } catch (err) {
    console.warn("Geocoding failed, using fallback coordinates:", err);
    return [];
  }
};
