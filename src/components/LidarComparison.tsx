import React from 'react';
import { motion } from 'motion/react';
import { X, ArrowLeftRight, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { LidarScan } from '../types';

interface LidarComparisonProps {
  scans: LidarScan[];
  onClose: () => void;
}

export const LidarComparison: React.FC<LidarComparisonProps> = ({ scans, onClose }) => {
  if (scans.length !== 2) return null;

  const [scan1, scan2] = scans;

  const diffSqFt = scan2.squareFootage - scan1.squareFootage;
  const diffPenalty = (scan2.productivityPenalty || 0) - (scan1.productivityPenalty || 0);
  
  const objects1 = new Set(scan1.detectedObjects);
  const objects2 = new Set(scan2.detectedObjects);
  
  const addedObjects = scan2.detectedObjects.filter(obj => !objects1.has(obj));
  const removedObjects = scan1.detectedObjects.filter(obj => !objects2.has(obj));
  const commonObjects = scan1.detectedObjects.filter(obj => objects2.has(obj));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-6xl max-h-full overflow-hidden rounded-3xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl">
              <ArrowLeftRight size={24} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900">LiDAR Scan Comparison</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Side-by-Side Spatial Analysis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid lg:grid-cols-2 gap-8 relative">
            {/* Comparison Divider */}
            <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 items-center justify-center pointer-events-none">
              <div className="w-px h-full bg-slate-100" />
              <div className="w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm text-slate-300 z-10">
                <ArrowLeftRight size={20} />
              </div>
            </div>

            {/* Scan 1 */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-widest">Baseline Scan</span>
                <span className="text-xs text-slate-400 font-mono">{new Date(scan1.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
                <img src={scan1.imageUrl} alt={scan1.roomName} className="w-full h-full object-cover opacity-70" referrerPolicy="no-referrer" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white font-bold text-lg">{scan1.roomName}</p>
                  <p className="text-indigo-300 text-[10px] font-mono uppercase tracking-widest">ID: {scan1.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Square Footage</p>
                  <p className="text-2xl font-display font-bold text-slate-900">{scan1.squareFootage} <span className="text-sm font-normal text-slate-500">sq ft</span></p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Productivity Penalty</p>
                  <p className="text-2xl font-display font-bold text-slate-900">+{scan1.productivityPenalty || 0}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detected Objects</p>
                <div className="flex flex-wrap gap-2">
                  {scan1.detectedObjects.map((obj, i) => (
                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg">
                      {obj}
                    </span>
                  ))}
                  {scan1.detectedObjects.length === 0 && <span className="text-xs text-slate-400 italic">None</span>}
                </div>
              </div>
            </div>

            {/* Scan 2 */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-widest">Comparison Scan</span>
                <span className="text-xs text-slate-400 font-mono">{new Date(scan2.timestamp).toLocaleString()}</span>
              </div>
              
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
                <img src={scan2.imageUrl} alt={scan2.roomName} className="w-full h-full object-cover opacity-70" referrerPolicy="no-referrer" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white font-bold text-lg">{scan2.roomName}</p>
                  <p className="text-indigo-300 text-[10px] font-mono uppercase tracking-widest">ID: {scan2.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${diffSqFt === 0 ? 'bg-slate-50 border-slate-100' : diffSqFt > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Square Footage</p>
                    {diffSqFt !== 0 && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold ${diffSqFt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {diffSqFt > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(diffSqFt)}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-display font-bold text-slate-900">{scan2.squareFootage} <span className="text-sm font-normal text-slate-500">sq ft</span></p>
                </div>
                <div className={`p-4 rounded-2xl border ${diffPenalty === 0 ? 'bg-slate-50 border-slate-100' : diffPenalty > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Productivity Penalty</p>
                    {diffPenalty !== 0 && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-bold ${diffPenalty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {diffPenalty > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(diffPenalty)}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-display font-bold text-slate-900">+{scan2.productivityPenalty || 0}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Object Changes</p>
                <div className="space-y-2">
                  {addedObjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase w-full">Added:</span>
                      {addedObjects.map((obj, i) => (
                        <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100 flex items-center gap-1">
                          <Plus size={10} /> {obj}
                        </span>
                      ))}
                    </div>
                  )}
                  {removedObjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] font-bold text-rose-600 uppercase w-full">Removed:</span>
                      {removedObjects.map((obj, i) => (
                        <span key={i} className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-lg border border-rose-100 flex items-center gap-1">
                          <Minus size={10} /> {obj}
                        </span>
                      ))}
                    </div>
                  )}
                  {commonObjects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase w-full">Unchanged:</span>
                      {commonObjects.map((obj, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-100">
                          {obj}
                        </span>
                      ))}
                    </div>
                  )}
                  {addedObjects.length === 0 && removedObjects.length === 0 && commonObjects.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No objects detected in either scan.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-12 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} /> Comparison Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Layout Stability</p>
                <p className="text-sm font-medium text-slate-700">
                  {diffSqFt === 0 
                    ? "Room boundaries are identical between scans." 
                    : `Room area has changed by ${Math.abs(diffSqFt)} sq ft.`}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Object Consistency</p>
                <p className="text-sm font-medium text-slate-700">
                  {addedObjects.length === 0 && removedObjects.length === 0 
                    ? "All detected objects are consistent across both scans." 
                    : `${addedObjects.length} new objects found, ${removedObjects.length} objects removed.`}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Labor Impact</p>
                <p className="text-sm font-medium text-slate-700">
                  {diffPenalty === 0 
                    ? "No change in estimated productivity penalty." 
                    : diffPenalty > 0 
                      ? `Increased object density suggests a ${diffPenalty}% higher cleaning time.`
                      : `Reduced object density suggests a ${Math.abs(diffPenalty)}% lower cleaning time.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
          >
            Close Comparison
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
