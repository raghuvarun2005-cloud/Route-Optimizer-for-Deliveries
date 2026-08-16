import React, { useState } from 'react';
import { MapPin, Navigation, Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Search, Plus, Trash2, Crosshair, Map } from 'lucide-react';
import { searchLocationNominatim } from '../services/api';

// Comprehensive Database of 25+ Prominent Bengaluru Localities & Hubs
const BENGALURU_LOCATIONS = [
  { name: 'Yelahanka New Town', latitude: 13.1007, longitude: 77.5963, area: 'North Bengaluru' },
  { name: 'Hebbal Flyover / Manyata Tech Park', latitude: 13.0358, longitude: 77.5970, area: 'North Bengaluru' },
  { name: 'MG Road Metro Station', latitude: 12.9756, longitude: 77.6066, area: 'Central Bengaluru' },
  { name: 'Koramangala 5th Block', latitude: 12.9352, longitude: 77.6245, area: 'South-East Bengaluru' },
  { name: 'Indiranagar 100ft Road', latitude: 12.9784, longitude: 77.6408, area: 'East Bengaluru' },
  { name: 'Whitefield ITPL', latitude: 12.9863, longitude: 77.7380, area: 'East Bengaluru' },
  { name: 'Electronic City Phase 1', latitude: 12.8399, longitude: 77.6770, area: 'South Bengaluru' },
  { name: 'HSR Layout Sector 1', latitude: 12.9121, longitude: 77.6446, area: 'South-East Bengaluru' },
  { name: 'BTM Layout 2nd Stage', latitude: 12.9166, longitude: 77.6101, area: 'South Bengaluru' },
  { name: 'Marathahalli Multiplex', latitude: 12.9592, longitude: 77.6974, area: 'East Bengaluru' },
  { name: 'Bellandur EcoSpace', latitude: 12.9260, longitude: 77.6762, area: 'South-East Bengaluru' },
  { name: 'Silk Board Junction', latitude: 12.9172, longitude: 77.6228, area: 'South Bengaluru' },
  { name: 'Majestic KSR Railway Station', latitude: 12.9781, longitude: 77.5697, area: 'Central Bengaluru' },
  { name: 'Jayanagar 4th Block', latitude: 12.9298, longitude: 77.5826, area: 'South Bengaluru' },
  { name: 'Rajajinagar Metro Station', latitude: 12.9982, longitude: 77.5530, area: 'West Bengaluru' },
  { name: 'Malleshwaram 8th Cross', latitude: 13.0031, longitude: 77.5696, area: 'West Bengaluru' },
  { name: 'Banashankari 3rd Stage', latitude: 12.9255, longitude: 77.5468, area: 'South-West Bengaluru' },
  { name: 'Nagavara Junction', latitude: 13.0418, longitude: 77.6234, area: 'North Bengaluru' },
  { name: 'KR Puram Railway Station', latitude: 13.0012, longitude: 77.6782, area: 'East Bengaluru' },
  { name: 'Kempegowda Int. Airport (BLR)', latitude: 13.1986, longitude: 77.7066, area: 'North Bengaluru' },
  { name: 'Vidhana Soudha / Cubbon Park', latitude: 12.9763, longitude: 77.5929, area: 'Central Bengaluru' },
  { name: 'Basavanagudi Bull Temple', latitude: 12.9431, longitude: 77.5683, area: 'South Bengaluru' },
  { name: 'Sarjapur Road Wipro SEZ', latitude: 12.9105, longitude: 77.6860, area: 'South-East Bengaluru' },
  { name: 'Kengeri Satellite Town', latitude: 12.9079, longitude: 77.4853, area: 'West Bengaluru' },
  { name: 'Peenya Industrial Area', latitude: 13.0329, longitude: 77.5147, area: 'North-West Bengaluru' }
];

export const ControlPanel = ({
  source,
  setSource,
  destination,
  setDestination,
  stops,
  setStops,
  onCalculateRoute,
  isCalculating,
  isNavigating,
  onStartNavigation,
  onPauseNavigation,
  onResetNavigation,
  onSimulateIncident,
  onClearIncidents,
  isPickingOnMap,
  setIsPickingOnMap,
  pickingTarget,
  setPickingTarget
}) => {
  const [sourceSearch, setSourceSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [sourceResults, setSourceResults] = useState([]);
  const [destResults, setDestResults] = useState([]);
  const [isSearchingSource, setIsSearchingSource] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const handleSearchSource = async (q) => {
    setSourceSearch(q);
    if (q.length > 2) {
      setIsSearchingSource(true);
      const res = await searchLocationNominatim(q);
      setSourceResults(res);
      setIsSearchingSource(false);
    } else {
      setSourceResults([]);
    }
  };

  const handleSearchDest = async (q) => {
    setDestSearch(q);
    if (q.length > 2) {
      setIsSearchingDest(true);
      const res = await searchLocationNominatim(q);
      setDestResults(res);
      setIsSearchingDest(false);
    } else {
      setDestResults([]);
    }
  };

  const addStop = () => {
    setStops([...stops, { name: `Stop #${stops.length + 1}`, latitude: (source.latitude + destination.latitude) / 2, longitude: (source.longitude + destination.longitude) / 2 }]);
  };

  const removeStop = (idx) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          Route Configuration
        </h2>

        <button
          onClick={() => {
            setIsPickingOnMap(!isPickingOnMap);
            if (!isPickingOnMap) setPickingTarget('source');
          }}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-colors border ${
            isPickingOnMap
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{isPickingOnMap ? `Click Map for ${pickingTarget}` : 'Pick on Map'}</span>
        </button>
      </div>

      {/* Source Input & Dropdown */}
      <div className="relative">
        <label className="text-xs font-semibold text-emerald-400 flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Current Location / Source
          </span>
          <span className="text-[10px] text-slate-400">Select Dropdown or Search</span>
        </label>

        {/* Dropdown Select Menu for Source */}
        <div className="mb-2">
          <select
            onChange={(e) => {
              const loc = BENGALURU_LOCATIONS.find(l => l.name === e.target.value);
              if (loc) {
                setSource(loc);
                setSourceSearch('');
              }
            }}
            value={BENGALURU_LOCATIONS.find(l => Math.abs(l.latitude - source.latitude) < 0.001 && Math.abs(l.longitude - source.longitude) < 0.001)?.name || ''}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
          >
            <option value="" disabled>-- Choose Bengaluru Location from Dropdown --</option>
            {BENGALURU_LOCATIONS.map((loc, idx) => (
              <option key={idx} value={loc.name}>
                📍 {loc.name} ({loc.area})
              </option>
            ))}
          </select>
        </div>

        {/* Search input for custom addresses */}
        <div className="relative">
          <input
            type="text"
            value={sourceSearch || source.name || ''}
            onChange={(e) => handleSearchSource(e.target.value)}
            placeholder="Or type address to search..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors pl-9"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {sourceResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto">
            {sourceResults.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSource(item);
                  setSourceSearch('');
                  setSourceResults([]);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-950/60 text-slate-200 border-b border-slate-800 last:border-0 truncate"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
          <span>Lat: {source.latitude.toFixed(4)}</span>
          <span>Lng: {source.longitude.toFixed(4)}</span>
        </div>
      </div>

      {/* Stop Waypoints if any */}
      {stops.length > 0 && (
        <div className="space-y-2 border-l-2 border-amber-500/40 pl-3 py-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">Delivery Stops ({stops.length})</span>
          </div>
          {stops.map((stop, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-300 font-medium">Stop #{idx + 1}: {stop.name}</span>
              <button onClick={() => removeStop(idx)} className="text-rose-400 hover:text-rose-300">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Destination Input & Dropdown */}
      <div className="relative">
        <label className="text-xs font-semibold text-sky-400 flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            Destination
          </span>
          <span className="text-[10px] text-slate-400">Select Dropdown or Search</span>
        </label>

        {/* Dropdown Select Menu for Destination */}
        <div className="mb-2">
          <select
            onChange={(e) => {
              const loc = BENGALURU_LOCATIONS.find(l => l.name === e.target.value);
              if (loc) {
                setDestination(loc);
                setDestSearch('');
              }
            }}
            value={BENGALURU_LOCATIONS.find(l => Math.abs(l.latitude - destination.latitude) < 0.001 && Math.abs(l.longitude - destination.longitude) < 0.001)?.name || ''}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-sky-300 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
          >
            <option value="" disabled>-- Choose Bengaluru Destination from Dropdown --</option>
            {BENGALURU_LOCATIONS.map((loc, idx) => (
              <option key={idx} value={loc.name}>
                📍 {loc.name} ({loc.area})
              </option>
            ))}
          </select>
        </div>

        {/* Search input for custom destination */}
        <div className="relative">
          <input
            type="text"
            value={destSearch || destination.name || ''}
            onChange={(e) => handleSearchDest(e.target.value)}
            placeholder="Or type address to search..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 transition-colors pl-9"
          />
          <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {destResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto">
            {destResults.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDestination(item);
                  setDestSearch('');
                  setDestResults([]);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-sky-950/60 text-slate-200 border-b border-slate-800 last:border-0 truncate"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
          <span>Lat: {destination.latitude.toFixed(4)}</span>
          <span>Lng: {destination.longitude.toFixed(4)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={addStop}
          className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Stop Waypoint</span>
        </button>
      </div>

      {/* Main Calculate Route Button */}
      <button
        onClick={onCalculateRoute}
        disabled={isCalculating}
        className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Navigation className="w-4 h-4" />
        <span>{isCalculating ? 'Calculating Dijkstra Path...' : 'Calculate Optimal Route'}</span>
      </button>

      {/* Navigation Simulation Section */}
      <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          Delivery Navigation Simulation
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {!isNavigating ? (
            <button
              onClick={onStartNavigation}
              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Delivery</span>
            </button>
          ) : (
            <button
              onClick={onPauseNavigation}
              className="py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-1.5 transition-colors shadow-md"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onResetNavigation}
            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Position</span>
          </button>
        </div>
      </div>

      {/* Dynamic Incident Simulator Section */}
      <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Real-Time Incident Simulator
        </h3>
        <p className="text-[11px] text-slate-400 leading-tight">
          Simulate a severe accident on the active route to demonstrate live dynamic rerouting from current position.
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={onSimulateIncident}
            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500/50 flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-950/40"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Incident</span>
          </button>

          <button
            onClick={onClearIncidents}
            className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clear Incident</span>
          </button>
        </div>
      </div>
    </div>
  );
};
