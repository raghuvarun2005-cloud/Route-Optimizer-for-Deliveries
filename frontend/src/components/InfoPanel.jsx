import React from 'react';
import { Route, Clock, Zap, CloudSun, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

export const InfoPanel = ({ routeData, weatherData, trafficData, incidents }) => {
  const distance = routeData?.total_distance_km ?? 8.4;
  const time = routeData?.estimated_time_mins ?? 14.2;
  const cost = routeData?.total_cost ?? 9.85;
  const algorithm = routeData?.algorithm_used ?? "Dijkstra's Algorithm";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
      {/* Route Metrics Card */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Route className="w-4 h-4 text-emerald-400" />
            Route Distance & Time
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-semibold border border-emerald-800">
            Optimal
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Distance</p>
            <p className="text-xl font-extrabold text-white">{distance} <span className="text-xs text-slate-400 font-medium">km</span></p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Est. Time</p>
            <p className="text-xl font-extrabold text-emerald-400">{time} <span className="text-xs text-slate-400 font-medium">mins</span></p>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Dijkstra Cost:</span>
          <span className="font-mono font-bold text-amber-400">{cost}</span>
        </div>
      </div>

      {/* Weather Metrics Card */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CloudSun className="w-4 h-4 text-sky-400" />
            Weather Condition
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
            {weatherData?.source || "OpenWeatherMap"}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-2xl font-black text-white">{weatherData?.temperature_c ?? 24}°C</p>
            <p className="text-xs font-medium text-sky-300 mt-0.5">{weatherData?.condition || "Partly Cloudy"}</p>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-0.5">
            <p>Rain: <span className="text-slate-200 font-medium">{weatherData?.rain_mm ?? 0.0} mm</span></p>
            <p>Wind: <span className="text-slate-200 font-medium">{weatherData?.wind_kph ?? 12} km/h</span></p>
            <p>Vis: <span className="text-slate-200 font-medium">{(weatherData?.visibility_m ?? 10000) / 1000} km</span></p>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 truncate">
          {weatherData?.status_message || "Live weather synced."}
        </div>
      </div>

      {/* Traffic Summary Card */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            Traffic Status
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-semibold border border-amber-800">
            {trafficData?.congestion_level || "LOW"}
          </span>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Speed Multiplier:</span>
            <span className="font-bold text-slate-200">{trafficData?.speed_multiplier || 1.0}x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Estimated Delay:</span>
            <span className="font-bold text-amber-400">+{trafficData?.delay_minutes || 0.0} mins</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 truncate">
          {trafficData?.status_message || "Traffic data synced across segments."}
        </div>
      </div>

      {/* Graph Algorithm Info Card */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            Algorithm & Graph Engine
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-semibold border border-purple-800">
            Min-Heap
          </span>
        </div>

        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Algorithm:</span>
            <span className="font-bold text-purple-300">Dijkstra's Shortest Path</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Time Complexity:</span>
            <span className="font-mono text-slate-300">O((V + E) log V)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Edge Cost Equation:</span>
            <span className="text-[10px] text-amber-300 font-mono">dist + traffic + inc + weather</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Dynamic Reroute Ready</span>
        </div>
      </div>
    </div>
  );
};
