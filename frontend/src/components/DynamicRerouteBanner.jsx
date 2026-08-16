import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ArrowRight, Clock, ShieldAlert } from 'lucide-react';

export const DynamicRerouteBanner = ({ rerouteData, isRecalculating, onClose }) => {
  if (!rerouteData && !isRecalculating) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-slate-900 shadow-xl shadow-amber-950/30 backdrop-blur transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      {isRecalculating ? (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  ⚠️ Incident Detected Ahead
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Rerouting in progress...
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Recalculating optimal path from current vehicle position using Dijkstra's algorithm...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-emerald-400">
                    ✓ Alternative Route Active
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-medium border border-emerald-700/50">
                    Recalculated from current location
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  {rerouteData.reason || "Avoided severe accident on initial road segment"}
                </p>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700"
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Metric Comparison Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Original Distance</p>
                <p className="text-sm font-bold text-slate-300">{rerouteData.original_distance_km} km</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className="text-right">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">New Distance</p>
                <p className="text-sm font-bold text-emerald-400">{rerouteData.new_distance_km} km</p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Original Est. Time</p>
                <p className="text-sm font-bold text-slate-300">{rerouteData.original_time_mins} min</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className="text-right">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">New Est. Time</p>
                <p className="text-sm font-bold text-emerald-400">{rerouteData.new_time_mins} min</p>
              </div>
            </div>

            <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">Estimated Time Saved</p>
                  <p className="text-base font-extrabold text-emerald-300">
                    +{rerouteData.estimated_time_saved_mins || 12.5} mins
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
