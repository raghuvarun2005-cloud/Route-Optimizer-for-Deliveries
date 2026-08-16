import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Custom Marker Icons
const createCustomIcon = (color, labelSymbol = '') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      ">
        ${labelSymbol}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const currentIcon = createCustomIcon('#10b981', '🚚');
const destinationIcon = createCustomIcon('#38bdf8', '🏁');
const stopIcon = createCustomIcon('#f59e0b', '📍');
const incidentIcon = createCustomIcon('#ef4444', '⚠️');

// Helper to auto-fit map view to polylines/markers
const MapRecenter = ({ center, bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, bounds, map]);
  return null;
};

// Map click handler for location picking
const MapClickHandler = ({ isPicking, pickingTarget, onPick }) => {
  useMapEvents({
    click(e) {
      if (isPicking && onPick) {
        onPick(e.latlng.lat, e.latlng.lng, pickingTarget);
      }
    },
  });
  return null;
};

export const MapView = ({
  currentPos,
  destination,
  stops = [],
  polyline = [],
  oldPolyline = [],
  incidents = [],
  isPickingOnMap,
  pickingTarget,
  onMapClickPick
}) => {
  const centerLat = currentPos?.latitude || 12.9716;
  const centerLng = currentPos?.longitude || 77.5946;

  // Calculate bounds for fitBounds
  const allCoords = [];
  if (currentPos) allCoords.push([currentPos.latitude, currentPos.longitude]);
  if (destination) allCoords.push([destination.latitude, destination.longitude]);
  if (polyline.length > 0) allCoords.push(...polyline);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Map Click Pick Indicator Overlay */}
      {isPickingOnMap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full font-bold text-xs shadow-xl animate-bounce flex items-center gap-1.5">
          <span>Click anywhere on the map to set {pickingTarget} location</span>
        </div>
      )}

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        {/* CartoDB Dark Matter Tiles for elegant aesthetic */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapRecenter center={[centerLat, centerLng]} bounds={allCoords.length > 1 ? allCoords : null} />
        <MapClickHandler isPicking={isPickingOnMap} pickingTarget={pickingTarget} onPick={onMapClickPick} />

        {/* Current Vehicle Position Marker */}
        {currentPos && (
          <Marker position={[currentPos.latitude, currentPos.longitude]} icon={currentIcon}>
            <Popup className="custom-popup">
              <div className="p-1">
                <p className="font-bold text-emerald-600 text-xs">🟢 Delivery Vehicle Position</p>
                <p className="text-[11px] text-slate-700">{currentPos.name || 'Current Location'}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {currentPos.latitude.toFixed(4)}, {currentPos.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-sky-600 text-xs">🔵 Destination</p>
                <p className="text-[11px] text-slate-700">{destination.name || 'Delivery Address'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Intermediate Stop Markers */}
        {stops.map((stop, idx) => (
          <Marker key={idx} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-amber-600 text-xs">📍 Waypoint Stop #{idx + 1}</p>
                <p className="text-[11px] text-slate-700">{stop.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active Incident Markers */}
        {incidents.map((inc, idx) => (
          <Marker key={idx} position={[inc.latitude, inc.longitude]} icon={incidentIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-rose-600 text-xs">🔴 {inc.type || 'Incident'} ({inc.severity || 'SEVERE'})</p>
                <p className="text-[11px] text-slate-700">{inc.description || 'Road segment obstructed'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Old affected route (faded red dashed line when rerouted) */}
        {oldPolyline.length > 0 && (
          <Polyline
            positions={oldPolyline}
            pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.5, dashArray: '6, 8' }}
          />
        )}

        {/* Primary Active Route Polyline */}
        {polyline.length > 0 && (
          <Polyline
            positions={polyline}
            pathOptions={{ color: '#10b981', weight: 6, opacity: 0.9 }}
          />
        )}
      </MapContainer>
    </div>
  );
};
