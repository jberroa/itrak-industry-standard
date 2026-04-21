import React, { useState } from 'react';
import { X, Plus, Hash, Layout } from 'lucide-react';
import { motion } from 'framer-motion';
import { RoomType, Room, FlooringType, EquipmentType, ServiceType } from '../types';
import { DEFAULT_FLOORING, DEFAULT_EQUIPMENT, DEFAULT_SERVICES } from '../constants/standards';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rooms: Room[]) => void;
  currentRoomCount: number;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({ isOpen, onClose, onAdd, currentRoomCount }) => {
  const [count, setCount] = useState(1);
  const [type, setType] = useState<RoomType>(RoomType.OFFICE);
  const [floor, setFloor] = useState('1');
  const [baseName, setBaseName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRooms: Room[] = [];
    const namePrefix = baseName.trim() || type;

    for (let i = 0; i < count; i++) {
      newRooms.push({
        id: Math.random().toString(36).substr(2, 9),
        name: `${namePrefix} ${currentRoomCount + i + 1}`,
        floor: floor || '1',
        department: '',
        type: type,
        flooringType: DEFAULT_FLOORING[type] || FlooringType.VCT,
        assignedEquipment: DEFAULT_EQUIPMENT[type] || [EquipmentType.MOP_BUCKET],
        serviceFrequencies: DEFAULT_SERVICES[type] || { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
        serviceOutliers: [],
        squareFootage: 0,
        cleaningFrequency: 5
      });
    }

    onAdd(newRooms);
    onClose();
    // Reset defaults
    setCount(1);
    setBaseName('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Plus size={20} />
            </div>
            <h2 className="text-xl font-display font-bold">Bulk Add Rooms</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Hash size={14} /> Number of Rooms
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold text-lg"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layout size={14} /> Room Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
            >
              {Object.values(RoomType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Floor</label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Name (Optional)</label>
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder={`e.g. ${type}`}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add {count} Rooms
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
