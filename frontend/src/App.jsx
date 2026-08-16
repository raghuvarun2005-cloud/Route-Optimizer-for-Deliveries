import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { MapView } from './components/MapView';
import { InfoPanel } from './components/InfoPanel';
import { DynamicRerouteBanner } from './components/DynamicRerouteBanner';
import {
  calculateRouteApi,
  rerouteMidDriveApi,
  createIncidentApi,
  clearAllIncidentsApi,
  getWeatherApi,
  getTrafficApi
} from './services/api';

export function App() {
  // Default locations: MG Road to Koramangala, Bengaluru
  const [source, setSource] = useState({
    name: 'MG Road Metro Station, Bengaluru',
    latitude: 12.9756,
    longitude: 77.6066
  });

  const [destination, setDestination] = useState({
    name: 'Koramangala 5th Block, Bengaluru',
    latitude: 12.9352,
    longitude: 77.6245
  });

  const [stops, setStops] = useState([]);

  // Route State
  const [routeData, setRouteData] = useState(null);
  const [polyline, setPolyline] = useState([]);
  const [oldPolyline, setOldPolyline] = useState([]);
  const [currentVehiclePos, setCurrentVehiclePos] = useState(source);

  // Status & Simulation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [rerouteSummary, setRerouteSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);

  // External APIs state
  const [weatherData, setWeatherData] = useState(null);
  const [trafficData, setTrafficData] = useState(null);

  // Map Picking State
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);
  const [pickingTarget, setPickingTarget] = useState('source');

  // Load initial weather & traffic on mount
  useEffect(() => {
    fetchWeatherAndTraffic(source.latitude, source.longitude);
  }, []);

  // Sync current vehicle pos with source when source changes & not navigating
  useEffect(() => {
    if (!isNavigating) {
      setCurrentVehiclePos(source);
    }
  }, [source, isNavigating]);

  const fetchWeatherAndTraffic = async (lat, lng) => {
    try {
      const weather = await getWeatherApi(lat, lng);
      setWeatherData(weather);

      const traffic = await getTrafficApi("R102", lat, lng);
      setTrafficData(traffic);
    } catch (err) {
      console.warn("External API sync notice:", err);
    }
  };

  // 1. Calculate Initial Route
  const handleCalculateRoute = async () => {
    setIsCalculating(true);
    setRerouteSummary(null);
    setOldPolyline([]);
    setNavStep(0);
    setIsNavigating(false);

    try {
      const res = await calculateRouteApi(source, destination, stops);
      setRouteData(res);
      if (res.polyline) {
        setPolyline(res.polyline);
        if (res.polyline.length > 0) {
          setCurrentVehiclePos({
            name: source.name,
            latitude: res.polyline[0][0],
            longitude: res.polyline[0][1]
          });
        }
      }
      fetchWeatherAndTraffic(source.latitude, source.longitude);
    } catch (err) {
      alert("Failed to calculate route: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsCalculating(false);
    }
  };

  // 2. Navigation Simulation Timer Loop
  useEffect(() => {
    let timer = null;
    if (isNavigating && polyline.length > 0) {
      timer = setInterval(() => {
        setNavStep((prevStep) => {
          const nextStep = prevStep + 1;
          if (nextStep < polyline.length) {
            const nextCoord = polyline[nextStep];
            setCurrentVehiclePos({
              name: `En-Route (${Math.round((nextStep / polyline.length) * 100)}%)`,
              latitude: nextCoord[0],
              longitude: nextCoord[1]
            });
            return nextStep;
          } else {
            setIsNavigating(false);
            alert("🎉 Delivery Vehicle has successfully arrived at Destination!");
            return prevStep;
          }
        });
      }, 1200); // Step every 1.2s
    }
    return () => clearInterval(timer);
  }, [isNavigating, polyline]);

  // 3. DYNAMIC REROUTING SIMULATION TRIGGER
  const handleSimulateIncident = async () => {
    if (!routeData) {
      alert("Please calculate an initial route first before simulating an incident.");
      return;
    }

    setIsRecalculating(true);

    // Midpoint coordinates of current vehicle position and destination for incident marker placement
    const incLat = (currentVehiclePos.latitude + destination.latitude) / 2.0;
    const incLng = (currentVehiclePos.longitude + destination.longitude) / 2.0;

    try {
      // Create incident record
      const newInc = await createIncidentApi(incLat, incLng, "R102", "Accident", "SEVERE");
      setIncidents((prev) => [...prev, newInc]);

      // Call mid-drive rerouting API re-anchoring to currentVehiclePos
      const reroutedRes = await rerouteMidDriveApi(
        routeData.id,
        currentVehiclePos,
        destination,
        "R102"
      );

      // Preserve old polyline for red dashed visual display
      setOldPolyline(polyline);
      setPolyline(reroutedRes.polyline || []);
      setRouteData(reroutedRes);
      setRerouteSummary(reroutedRes.reroute_summary);
      setNavStep(0);
    } catch (err) {
      alert("Reroute trigger failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsRecalculating(false);
    }
  };

  // 4. Clear Incident Restoration
  const handleClearIncidents = async () => {
    try {
      await clearAllIncidentsApi();
      setIncidents([]);
      setRerouteSummary(null);
      setOldPolyline([]);
      handleCalculateRoute();
    } catch (err) {
      console.warn("Clear incidents warning:", err);
    }
  };

  // Map Click Coordinate Selector
  const handleMapClickPick = (lat, lng, target) => {
    if (target === 'source') {
      setSource({
        name: `Map Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        latitude: lat,
        longitude: lng
      });
      setIsPickingOnMap(false);
    } else if (target === 'destination') {
      setDestination({
        name: `Map Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        latitude: lat,
        longitude: lng
      });
      setIsPickingOnMap(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Dynamic Reroute Alert Banner */}
        <DynamicRerouteBanner
          rerouteData={rerouteSummary}
          isRecalculating={isRecalculating}
          onClose={() => setRerouteSummary(null)}
        />

        {/* Main Grid: Control Panel Left, Interactive Map Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <ControlPanel
              source={source}
              setSource={setSource}
              destination={destination}
              setDestination={setDestination}
              stops={stops}
              setStops={setStops}
              onCalculateRoute={handleCalculateRoute}
              isCalculating={isCalculating}
              isNavigating={isNavigating}
              onStartNavigation={() => {
                if (polyline.length === 0) handleCalculateRoute();
                setIsNavigating(true);
              }}
              onPauseNavigation={() => setIsNavigating(false)}
              onResetNavigation={() => {
                setIsNavigating(false);
                setNavStep(0);
                setCurrentVehiclePos(source);
              }}
              onSimulateIncident={handleSimulateIncident}
              onClearIncidents={handleClearIncidents}
              isPickingOnMap={isPickingOnMap}
              setIsPickingOnMap={setIsPickingOnMap}
              pickingTarget={pickingTarget}
              setPickingTarget={setPickingTarget}
            />
          </div>

          <div className="lg:col-span-8">
            <MapView
              currentPos={currentVehiclePos}
              destination={destination}
              stops={stops}
              polyline={polyline}
              oldPolyline={oldPolyline}
              incidents={incidents}
              isPickingOnMap={isPickingOnMap}
              pickingTarget={pickingTarget}
              onMapClickPick={handleMapClickPick}
            />
          </div>
        </div>

        {/* Information Panel Footer Cards */}
        <InfoPanel
          routeData={routeData}
          weatherData={weatherData}
          trafficData={trafficData}
          incidents={incidents}
        />
      </main>
    </div>
  );
}
