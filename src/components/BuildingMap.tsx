import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Room, RoomType } from '../types';
import { Map as MapIcon, Layers, Maximize2 } from 'lucide-react';

interface BuildingMapProps {
  rooms: Room[];
}

const ROOM_COLORS: Record<RoomType, string> = {
  [RoomType.OFFICE]: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  [RoomType.RESTROOM]: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
  [RoomType.LOBBY]: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  [RoomType.HALLWAY]: 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100',
  [RoomType.CONFERENCE]: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  [RoomType.BREAKROOM]: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  [RoomType.CLASSROOM]: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  [RoomType.STAIRWELL]: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
  [RoomType.STORAGE]: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
  [RoomType.EXAM_ROOM]: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
  [RoomType.PATIENT_ROOM]: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
  [RoomType.SURGICAL_ROOM]: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  [RoomType.LABORATORY]: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
  [RoomType.PHARMACY]: 'bg-lime-50 border-lime-200 text-lime-700 hover:bg-lime-100',
  [RoomType.RADIOLOGY]: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-100',
  [RoomType.OTHER]: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
};

const LEGEND_COLORS: Record<RoomType, string> = {
  [RoomType.OFFICE]: 'bg-blue-500',
  [RoomType.RESTROOM]: 'bg-slate-500',
  [RoomType.LOBBY]: 'bg-emerald-500',
  [RoomType.HALLWAY]: 'bg-zinc-500',
  [RoomType.CONFERENCE]: 'bg-indigo-500',
  [RoomType.BREAKROOM]: 'bg-orange-500',
  [RoomType.CLASSROOM]: 'bg-purple-500',
  [RoomType.STAIRWELL]: 'bg-rose-500',
  [RoomType.STORAGE]: 'bg-amber-500',
  [RoomType.EXAM_ROOM]: 'bg-cyan-500',
  [RoomType.PATIENT_ROOM]: 'bg-teal-500',
  [RoomType.SURGICAL_ROOM]: 'bg-red-500',
  [RoomType.LABORATORY]: 'bg-violet-500',
  [RoomType.PHARMACY]: 'bg-lime-500',
  [RoomType.RADIOLOGY]: 'bg-fuchsia-500',
  [RoomType.OTHER]: 'bg-gray-500',
};

export const BuildingMap: React.FC<BuildingMapProps> = ({ rooms }) => {
  const roomsByFloor = useMemo(() => {
    const floors: Record<string, Room[]> = {};
    rooms.forEach(room => {
      const floor = room.floor || '1';
      if (!floors[floor]) floors[floor] = [];
      floors[floor].push(room);
    });
    return Object.entries(floors).sort(([a], [b]) => a.localeCompare(b));
  }, [rooms]);

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    const totalSqFt = rooms.reduce((acc, r) => acc + (r.squareFootage || 0), 0);
    
    rooms.forEach(room => {
      counts[room.type] = (counts[room.type] || 0) + (room.squareFootage || 0);
    });

    return Object.entries(counts)
      .map(([type, sqft]) => ({
        type,
        sqft,
        percentage: totalSqFt > 0 ? (sqft / totalSqFt) * 100 : 0
      }))
      .sort((a, b) => b.sqft - a.sqft);
  }, [rooms]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <MapIcon size={20} />
          </div>
          <h2 className="text-xl font-display font-bold">Building Map Visualization</h2>
        </div>
        
        {/* Percentage Bar */}
        <div className="flex-1 max-w-xl">
          <div className="flex justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Space Distribution (by SqFt)</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rooms.length} Total Rooms</p>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {typeDistribution.map((item, idx) => (
              <div 
                key={item.type}
                className={`h-full transition-all duration-500 ${LEGEND_COLORS[item.type as RoomType] || 'bg-gray-200'}`}
                style={{ width: `${item.percentage}%` }}
                title={`${item.type}: ${item.percentage.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {typeDistribution.slice(0, 5).map(item => (
              <span key={item.type} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <div className={`w-2 h-2 rounded-full ${LEGEND_COLORS[item.type as RoomType] || 'bg-gray-200'}`} />
                {item.type}: {item.percentage.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {roomsByFloor.map(([floor, floorRooms]) => (
        <section key={floor} className="space-y-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Layers size={16} />
            <h3 className="text-sm font-bold uppercase tracking-widest">Floor {floor}</h3>
            <div className="flex-1 h-px bg-slate-100 ml-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-4 grid-flow-dense">
            {floorRooms.map((room, idx) => {
              // Calculate relative size based on square footage for a more intuitive map
              const sqft = room.squareFootage || 0;
              let colSpan = "col-span-1";
              let rowSpan = "row-span-1";
              
              if (sqft > 5000) {
                colSpan = "col-span-2 md:col-span-4 lg:col-span-6";
                rowSpan = "row-span-3";
              } else if (sqft > 2500) {
                colSpan = "col-span-2 md:col-span-3 lg:col-span-4";
                rowSpan = "row-span-2";
              } else if (sqft > 1000) {
                colSpan = "col-span-2 md:col-span-2 lg:col-span-3";
                rowSpan = "row-span-2";
              } else if (sqft > 500) {
                colSpan = "col-span-1 md:col-span-2 lg:col-span-2";
                rowSpan = "row-span-1";
              }

              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`
                    ${colSpan} ${rowSpan}
                    ${ROOM_COLORS[room.type] || ROOM_COLORS[RoomType.OTHER]}
                    border rounded-2xl p-4 flex flex-col justify-between min-h-[120px] shadow-sm hover:shadow-md transition-all group relative overflow-hidden
                  `}
                >
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{room.type}</p>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-indigo-900 transition-colors">{room.name}</h4>
                  </div>
                  
                  <div className="relative z-10 flex items-end justify-between mt-4">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold opacity-70">
                      <Maximize2 size={10} />
                      {sqft.toLocaleString()} SQFT
                    </div>
                    {room.outliers && (
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title={room.outliers} />
                    )}
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <MapIcon size={80} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}

      {rooms.length === 0 && (
        <div className="glass-card p-20 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <MapIcon size={32} />
          </div>
          <p className="text-slate-500">No rooms available to visualize. Please add rooms or upload data first.</p>
        </div>
      )}
    </div>
  );
};
