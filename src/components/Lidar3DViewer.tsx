import React, { Suspense, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Text, 
  Float, 
  Points, 
  PointMaterial,
  Grid,
  Html
} from '@react-three/drei';
import { LidarScan, LidarHighlight } from '../types';
import { Box as BoxIcon, Info, Sparkles, Target, Ruler, Layers, X, Activity } from 'lucide-react';

interface Lidar3DViewerProps {
  scans: LidarScan[];
  onClose?: () => void;
  highlightedLabel?: string | null;
}

const RoomBox = ({ width, depth, height }: { width: number; depth: number; height: number }) => {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Grid on floor */}
      <Grid 
        infiniteGrid 
        fadeDistance={30} 
        fadeStrength={5} 
        cellSize={1} 
        sectionSize={5} 
        sectionColor="#334155" 
        cellColor="#1e293b" 
        position={[0, 0, 0]} 
      />

      {/* Walls (Wireframe for technical look) */}
      <group position={[0, height / 2, 0]}>
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial 
            color="#6366f1" 
            transparent 
            opacity={0.05} 
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
          <lineBasicMaterial color="#4f46e5" transparent opacity={0.3} />
        </lineSegments>
      </group>
    </group>
  );
};

const PointCloud = ({ points, roomWidth, roomDepth, roomHeight }: { points: number[][]; roomWidth: number; roomDepth: number; roomHeight: number }) => {
  const positions = useMemo(() => {
    const pos = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      pos[i * 3] = (p[0] / 100) * roomWidth - roomWidth / 2;
      pos[i * 3 + 1] = (p[2] / 100) * roomHeight;
      pos[i * 3 + 2] = (p[1] / 100) * roomDepth - roomDepth / 2;
    });
    return pos;
  }, [points, roomWidth, roomDepth, roomHeight]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#818cf8"
        size={0.12}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.6}
      />
    </Points>
  );
};

const HighlightObject = ({ highlight, roomWidth, roomDepth, roomHeight, isHighlighted }: { highlight: LidarHighlight; roomWidth: number; roomDepth: number; roomHeight: number; isHighlighted: boolean }) => {
  const x = (highlight.x / 100) * roomWidth - roomWidth / 2 + (highlight.width / 200) * roomWidth;
  const z = (highlight.y / 100) * roomDepth - roomDepth / 2 + (highlight.depth ? (highlight.depth / 200) * roomDepth : (highlight.height / 200) * roomDepth);
  const y = highlight.z ? (highlight.z / 100) * roomHeight : 0;
  
  const w = (highlight.width / 100) * roomWidth;
  const d = (highlight.depth ? highlight.depth / 100 : highlight.height / 100) * roomDepth;
  const h = isHighlighted ? 1.4 : 1.0; 

  return (
    <group position={[x, y + h / 2, z]}>
      <Float speed={isHighlighted ? 4 : 0} rotationIntensity={0} floatIntensity={isHighlighted ? 0.5 : 0}>
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial 
            color={isHighlighted ? "#f43f5e" : "#fbbf24"} 
            transparent 
            opacity={isHighlighted ? 0.4 : 0.2} 
            emissive={isHighlighted ? "#f43f5e" : "#fbbf24"}
            emissiveIntensity={isHighlighted ? 1 : 0.2}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineBasicMaterial color={isHighlighted ? "#f43f5e" : "#fbbf24"} linewidth={2} />
        </lineSegments>
        
        <Html distanceFactor={10} position={[0, h / 2 + 0.5, 0]}>
          <div className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 shadow-2xl border
            ${isHighlighted 
              ? 'bg-rose-600 text-white border-rose-400 scale-110' 
              : 'bg-slate-900/80 text-slate-300 border-slate-700 opacity-60'}`}>
            <Target size={10} />
            {highlight.label}
          </div>
        </Html>
      </Float>
    </group>
  );
};

export const Lidar3DViewer: React.FC<Lidar3DViewerProps> = ({ scans, onClose, highlightedLabel }) => {
  const [activeScanIndex, setActiveScanIndex] = React.useState(0);
  const [isRawMode, setIsRawMode] = React.useState(false);
  const [showOverlay, setShowOverlay] = React.useState(false);

  const scan = scans[activeScanIndex] || scans[0];
  
  const side = Math.sqrt(scan.squareFootage);
  const roomWidth = side / 2.5; 
  const roomDepth = side / 2.5;
  const roomHeight = 4;

  return (
    <div className="w-full h-full bg-slate-950 rounded-2xl overflow-hidden relative group/viewer">
      {/* Technical HUD Overlay */}
      <div className="absolute top-6 left-6 z-10 space-y-4 pointer-events-none">
        <div className="bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
              {isRawMode ? 'Raw Point Cloud' : 'Spatial Reconstruction'}
            </p>
          </div>
          <h3 className="text-white font-display font-bold text-xl">{scan.roomName}</h3>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Ruler size={12} className="text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">{scan.squareFootage} SQ FT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={12} className="text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">{scan.roomType.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md p-3 rounded-xl border border-white/5 inline-flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-500 uppercase">Confidence</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{(scan.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-500 uppercase">Points</span>
            <span className="text-xs font-mono font-bold text-indigo-400">{scan.pointCloudData?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Mode Toggles */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 pointer-events-auto">
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 bg-slate-800/80 hover:bg-rose-600 text-white rounded-xl border border-white/10 transition-all self-end mb-2"
          >
            <X size={20} />
          </button>
        )}
        
        <div className="bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 flex flex-col gap-1">
          <button 
            onClick={() => setIsRawMode(!isRawMode)}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${isRawMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Activity size={14} /> Raw Mode
          </button>
          {scans.length > 1 && (
            <button 
              onClick={() => setShowOverlay(!showOverlay)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${showOverlay ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Layers size={14} /> Overlay All
            </button>
          )}
        </div>

        {scans.length > 1 && !showOverlay && (
          <div className="bg-slate-900/60 backdrop-blur-md p-2 rounded-2xl border border-white/5 space-y-2">
            <p className="text-[8px] font-bold text-slate-500 uppercase px-2">Select Scan</p>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
              {scans.map((s, idx) => (
                <button 
                  key={s.id}
                  onClick={() => setActiveScanIndex(idx)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-medium transition-all text-left truncate ${activeScanIndex === idx ? 'bg-white/10 text-white border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {new Date(s.timestamp).toLocaleTimeString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[roomWidth * 1.2, roomHeight * 1.5, roomDepth * 1.2]} fov={45} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={!highlightedLabel && !isRawMode}
          autoRotateSpeed={0.5}
        />
        
        <ambientLight intensity={isRawMode ? 0.1 : 0.2} />
        <spotLight position={[15, 20, 15]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={1} color="#4f46e5" />
        
        <Suspense fallback={null}>
          {!isRawMode && <RoomBox width={roomWidth} depth={roomDepth} height={roomHeight} />}
          
          {showOverlay ? (
            scans.map((s, idx) => (
              s.pointCloudData && (
                <PointCloud 
                  key={s.id}
                  points={s.pointCloudData} 
                  roomWidth={roomWidth} 
                  roomDepth={roomDepth} 
                  roomHeight={roomHeight} 
                />
              )
            ))
          ) : (
            scan.pointCloudData && (
              <PointCloud 
                points={scan.pointCloudData} 
                roomWidth={roomWidth} 
                roomDepth={roomDepth} 
                roomHeight={roomHeight} 
              />
            )
          )}

          {!isRawMode && !showOverlay && scan.highlights?.map((h, i) => (
            <HighlightObject 
              key={i} 
              highlight={h} 
              roomWidth={roomWidth} 
              roomDepth={roomDepth} 
              roomHeight={roomHeight}
              isHighlighted={highlightedLabel === h.label}
            />
          ))}
          
          {!isRawMode && (
            <ContactShadows 
              position={[0, 0, 0]} 
              opacity={0.6} 
              scale={30} 
              blur={2.5} 
              far={10} 
            />
          )}
          <Environment preset="night" />
        </Suspense>
      </Canvas>

      {/* Controls Legend */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-3 opacity-0 group-hover/viewer:opacity-100 transition-opacity duration-500">
        <div className="px-3 py-1.5 bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Orbit: Left Click
        </div>
        <div className="px-3 py-1.5 bg-slate-900/60 backdrop-blur-md rounded-lg border border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Pan: Right Click
        </div>
      </div>

      <AnimatePresence>
        {highlightedLabel && (
          <motion.div 
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className="absolute top-6 right-6 z-10 w-72 bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                  <Target size={14} />
                </div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em]">Object Analysis</span>
              </div>
            </div>
            
            <h4 className="text-white font-display font-bold text-xl mb-3">{highlightedLabel}</h4>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                  <Sparkles size={10} /> AI Identification
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Identified as a productivity outlier. Spatial geometry suggests complex cleaning requirements.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <p className="text-[8px] font-bold text-rose-500 uppercase mb-1">Impact</p>
                  <p className="text-sm font-mono font-bold text-rose-400">+12.5%</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <p className="text-[8px] font-bold text-emerald-500 uppercase mb-1">Certainty</p>
                  <p className="text-sm font-mono font-bold text-emerald-400">99.2%</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
