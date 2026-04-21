import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Zap, 
  Upload, 
  Cpu, 
  Maximize2, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Scan,
  Bluetooth,
  Usb
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { analyzeLidarMap } from '../services/gemini';
import { Room, LidarScan, RoomType } from '../types';

interface LidarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomsExtracted: (rooms: Partial<Room>[]) => void;
  onScanComplete: (scan: LidarScan) => void;
}

export const LidarModal: React.FC<LidarModalProps> = ({ isOpen, onClose, onRoomsExtracted, onScanComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [scanMode, setScanMode] = useState<'upload' | 'live'>('upload');
  const [arHighlights, setArHighlights] = useState<{ id: number; x: number; y: number; label: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen && scanMode === 'live' && connectionStatus === 'connected') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, scanMode, connectionStatus]);

  // Simulate moving AR highlights
  useEffect(() => {
    if (scanMode !== 'live' || connectionStatus !== 'connected') return;

    const interval = setInterval(() => {
      setArHighlights([
        { id: 1, x: 20 + Math.sin(Date.now() / 1000) * 5, y: 30 + Math.cos(Date.now() / 1200) * 5, label: 'Desk' },
        { id: 2, x: 60 + Math.cos(Date.now() / 800) * 8, y: 40 + Math.sin(Date.now() / 1500) * 3, label: 'Equipment' },
        { id: 3, x: 40 + Math.sin(Date.now() / 2000) * 10, y: 70 + Math.cos(Date.now() / 1800) * 4, label: 'Chair' }
      ]);
    }, 50);

    return () => clearInterval(interval);
  }, [scanMode, connectionStatus]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    try {
      for (const file of acceptedFiles) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const extracted = await analyzeLidarMap(base64.split(',')[1], file.type);
          
          if (extracted.length > 0) {
            const firstRoom = extracted[0];
            const newScan: LidarScan = {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              imageUrl: base64,
              roomName: firstRoom.roomName || 'Scanned Room',
              roomType: firstRoom.roomType || RoomType.OTHER,
              squareFootage: firstRoom.squareFootage || 0,
              volume: firstRoom.volume || 0,
              detectedObjects: firstRoom.detectedObjects || [],
              highlights: firstRoom.highlights || [],
              pointCloudData: firstRoom.pointCloudData || [],
              confidence: firstRoom.confidence || 0.95,
              aiReasoning: firstRoom.aiReasoning,
              productivityPenalty: firstRoom.productivityPenalty || 0,
              status: 'processed',
              notes: ''
            };
            onScanComplete(newScan);
          }
          
          // Map back to Partial<Room> for the Building Setup tab
          const roomData: Partial<Room>[] = extracted.map(e => ({
            name: e.roomName,
            type: e.roomType,
            squareFootage: e.squareFootage,
            outliers: e.detectedObjects?.join(', '),
            productivityPenalty: e.productivityPenalty
          }));
          
          onRoomsExtracted(roomData);
          onClose();
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Lidar processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [onRoomsExtracted, onClose]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  const connectHardware = async () => {
    setConnectionStatus('connecting');
    // Simulate Web Serial API connection
    setTimeout(() => {
      setConnectionStatus('connected');
      setScanMode('live');
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <Scan size={24} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900">LiDAR Integration</h2>
                <p className="text-sm text-slate-500">Yahboom MS200 & SLAM Mapping</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="glass-card p-5 space-y-4 border-indigo-100 bg-indigo-50/30">
                  <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Cpu size={18} /> Hardware Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Device:</span>
                      <span className="font-medium">Yahboom MS200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Range:</span>
                      <span className="font-medium">12m / 360°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Interface:</span>
                      <span className="font-medium">USB / Serial</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connection Status</h4>
                  <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                    connectionStatus === 'connected' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                    connectionStatus === 'connecting' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                    'bg-slate-50 border-slate-100 text-slate-500'
                  }`}>
                    {connectionStatus === 'connected' ? <CheckCircle2 size={16} /> : 
                     connectionStatus === 'connecting' ? <Loader2 size={16} className="animate-spin" /> : 
                     <AlertCircle size={16} />}
                    <span className="text-sm font-medium capitalize">{connectionStatus}</span>
                  </div>
                  
                  {connectionStatus === 'disconnected' && (
                    <button 
                      onClick={connectHardware}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                      <Usb size={18} /> Connect Device
                    </button>
                  )}
                </div>
              </div>

              {/* Main Area */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                  <button 
                    onClick={() => setScanMode('upload')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                  >
                    Upload Map
                  </button>
                  <button 
                    onClick={() => setScanMode('live')}
                    disabled={connectionStatus !== 'connected'}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'live' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 disabled:opacity-50'}`}
                  >
                    Live Scan
                  </button>
                </div>

                {scanMode === 'upload' ? (
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer h-80 flex flex-col items-center justify-center ${
                      isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isProcessing ? (
                      <div className="space-y-4">
                        <Loader2 size={48} className="text-indigo-600 animate-spin mx-auto" />
                        <p className="text-slate-600 font-medium">Analyzing LiDAR Point Cloud...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                          <Upload size={32} />
                        </div>
                        <div>
                          <p className="text-slate-900 font-bold">Upload LiDAR Map Image</p>
                          <p className="text-slate-500 text-sm mt-1">Drag & drop your SLAM occupancy grid (PNG/JPG)</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative bg-slate-900 rounded-3xl h-80 overflow-hidden flex items-center justify-center border-4 border-slate-800 shadow-inner">
                    {/* Live Camera Feed */}
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />

                    {/* AR Overlay Grid */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="h-full w-full grid grid-cols-12 grid-rows-12 gap-4 opacity-20">
                        {Array.from({ length: 144 }).map((_, i) => (
                          <div key={i} className="border-[0.5px] border-indigo-500/20" />
                        ))}
                      </div>
                      
                      {/* Simulated AR Highlights */}
                      {arHighlights.map(h => (
                        <motion.div
                          key={h.id}
                          initial={false}
                          animate={{ x: `${h.x}%`, y: `${h.y}%` }}
                          className="absolute w-12 h-12 border-2 border-amber-400 bg-amber-400/20 rounded-lg flex items-center justify-center"
                          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                        >
                          <div className="absolute -top-6 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                            {h.label}
                          </div>
                          <div className="w-1 h-1 bg-amber-400 rounded-full animate-ping" />
                        </motion.div>
                      ))}

                      {/* Room Boundary Simulation */}
                      <svg className="absolute inset-0 w-full h-full opacity-40">
                        <motion.path
                          d="M 10,10 L 90,10 L 90,90 L 10,90 Z"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          animate={{ strokeDashoffset: [0, 10] }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        />
                      </svg>
                    </div>
                    
                    <div className="relative z-10 text-center space-y-4 bg-slate-900/40 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                      <div className="w-16 h-16 border-2 border-indigo-500 rounded-full flex items-center justify-center mx-auto animate-spin-slow">
                        <div className="w-1 h-8 bg-indigo-500 origin-bottom" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-indigo-400 font-mono text-[10px] uppercase tracking-widest">AR Overlay Active</p>
                        <p className="text-white font-bold text-sm">Real-Time Spatial Analysis</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsProcessing(true);
                          setTimeout(() => {
                            const extracted = [{ 
                              name: 'Scanned Office', 
                              squareFootage: 185, 
                              type: RoomType.OFFICE, 
                              outliers: '2 Desks, 2 Executive Chairs, 1 Large Filing Cabinet, 1 Floor Lamp' 
                            }];
                            const newScan: LidarScan = {
                              id: Math.random().toString(36).substr(2, 9),
                              timestamp: Date.now(),
                              imageUrl: 'https://picsum.photos/seed/lidar-office/800/600',
                              roomName: 'Scanned Office',
                              roomType: RoomType.OFFICE,
                              squareFootage: 185,
                              volume: 1665,
                              detectedObjects: ['2 Desks', '2 Executive Chairs', '1 Large Filing Cabinet', '1 Floor Lamp'],
                              highlights: [
                                { label: 'Desk 1', x: 15, y: 25, z: 0, width: 20, height: 15, depth: 15 },
                                { label: 'Desk 2', x: 45, y: 25, z: 0, width: 20, height: 15, depth: 15 },
                                { label: 'Filing Cabinet', x: 75, y: 60, z: 0, width: 15, height: 20, depth: 10 },
                                { label: 'Floor Lamp', x: 10, y: 75, z: 0, width: 8, height: 8, depth: 8 }
                              ],
                              pointCloudData: Array.from({ length: 100 }, () => [Math.random() * 100, Math.random() * 100, Math.random() * 100]),
                              confidence: 0.98,
                              aiReasoning: 'Identified as Office due to the presence of multiple desks and executive chairs within a rectangular 185 sq ft boundary. The high density of furniture suggests a significant productivity impact.',
                              productivityPenalty: 22,
                              status: 'processed',
                              notes: 'Initial scan of the executive suite. Furniture is densely packed.'
                            };
                            onScanComplete(newScan);
                            onRoomsExtracted(extracted);
                            onClose();
                          }, 2000);
                        }}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Capture & Process
                      </button>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-white font-mono drop-shadow-md">SIGNAL: 98%</span>
                        </div>
                        <div className="text-[10px] text-white/70 font-mono drop-shadow-md">LATENCY: 12ms</div>
                      </div>
                      <div className="text-[10px] text-white/70 font-mono uppercase drop-shadow-md">AR Engine: v2.4.0</div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Maximize2 size={16} className="text-indigo-600" /> How it works
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The MS200 uses laser pulses to measure distances. Our AI analyzes the resulting point cloud or occupancy grid to automatically detect walls, calculate square footage, and identify "outliers" like large equipment or floor-to-ceiling windows.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
