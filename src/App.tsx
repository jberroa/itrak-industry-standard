import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Building2, 
  Upload, 
  Plus, 
  Trash2, 
  Calculator, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  LayoutDashboard,
  ChevronRight,
  Info,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  ExternalLink,
  History,
  Sun,
  Moon,
  FileText,
  TrendingUp,
  Award,
  Download,
  ShieldCheck,
  Zap,
  Sparkles,
  Scan,
  Usb,
  Activity,
  Maximize2,
  Edit,
  Check,
  Box,
  X,
  Search,
  Filter,
  Columns2,
  ArrowLeftRight,
  RefreshCw,
  Lock,
  Settings,
  Key,
  LogOut,
  QrCode,
  DollarSign
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { QRCodeCanvas } from 'qrcode.react';
import { Room, RoomType, Building, CalculationResult, FlooringType, FlooringBreakdown, EquipmentType, ServiceType, LidarScan, UserRole, UserProfile, ShiftTask } from './types';
import { BuildingMap } from './components/BuildingMap';
import { BulkAddModal } from './components/BulkAddModal';
import { LidarModal } from './components/LidarModal';
import { Lidar3DViewer } from './components/Lidar3DViewer';
import { LidarComparison } from './components/LidarComparison';
import { analyzeRoomImage, analyzeLidarMap } from './services/gemini';
import { parseExcelFile, exportToExcel } from './services/excel';
import { calculateRequirements } from './services/calculator';
import {
  fetchBootstrap,
  saveBuildings,
  saveLidarScans,
  savePasscode,
  saveUserProfiles,
} from './services/storageApi';
import { 
  DEFAULT_FLOORING, 
  DEFAULT_EQUIPMENT, 
  EQUIPMENT_PRODUCTIVITY, 
  SERVICE_MULTIPLIERS, 
  DEFAULT_SERVICES,
  CLEANING_RATES,
  ANNUAL_FLOOR_CARE_RATES,
  HOURS_PER_FTE_WEEK,
  FTE_PER_MANAGER,
  OVERSIGHT_HOURS_PER_EMPLOYEE,
  DEFAULT_LABOR_RATES
} from './constants/standards';

// Components
const Header = () => (
  <header className="py-8 px-6 border-b border-slate-200 bg-white">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Building2 size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Medama <span className="text-indigo-600">ITRAK</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">Industry Standard Assistant</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> ISSA Standards</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> AI-Powered Analysis</span>
      </div>
    </div>
  </header>
);

// Helper Component for Visual Shift Timeline
const ShiftTimeline = ({ shiftType, tasks }: { shiftType: 'day' | 'evening' | 'night', tasks: ShiftTask[] }) => {
  const shiftInfo = {
    day: { start: '07:00 AM', name: 'Day Shift', color: 'bg-amber-400', barColor: 'bg-amber-500' },
    evening: { start: '03:00 PM', name: 'Evening Shift', color: 'bg-indigo-400', barColor: 'bg-indigo-500' },
    night: { start: '11:00 PM', name: 'Night Shift', color: 'bg-slate-500', barColor: 'bg-slate-600' }
  }[shiftType];

  const totalMinutes = tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const shiftLimit = 480; // 8 hours = 480 mins

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${shiftInfo.color} rounded-lg text-white`}>
             {shiftType === 'day' ? <Sun size={14} /> : shiftType === 'evening' ? <Moon size={14} /> : <Zap size={14} />}
          </div>
          <div className="text-left">
             <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">{shiftInfo.name} Timeline</h5>
             <p className="text-[10px] text-slate-500 font-medium tracking-tight">Standardized Sequence • {shiftInfo.start} Start</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900 leading-none">{totalMinutes} <span className="text-[10px] text-slate-400 font-normal">mins assigned</span></p>
          <div className="w-24 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min(100, (totalMinutes/shiftLimit)*100)}%` }}
               className="h-full bg-indigo-500" 
             />
          </div>
        </div>
      </div>
      
      <div className="h-12 w-full bg-slate-50 rounded-xl overflow-hidden flex border border-slate-200/50 shadow-inner relative group/timeline">
        {tasks.map((task, idx) => (
          <motion.div 
            key={task.id}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className={`${shiftInfo.barColor} h-full border-r border-white/20 relative group transition-all hover:brightness-110 origin-left`}
            style={{ width: `${(task.estimatedMinutes / shiftLimit) * 100}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1">
              {task.estimatedMinutes >= 40 && (
                <span className="text-[9px] font-bold text-white truncate max-w-full leading-none drop-shadow-sm pointer-events-none">
                  {task.estimatedMinutes}m
                </span>
              )}
            </div>
            
            {/* Improved Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-900 text-white p-3 rounded-xl text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-none z-30 shadow-2xl border border-white/10 text-left">
              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                <p className="font-bold text-indigo-300">Phase {idx + 1} Assignment</p>
                <div className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md text-[8px] font-bold border border-indigo-500/30">
                  {task.estimatedMinutes} mins
                </div>
              </div>
              <p className="text-xs font-medium leading-relaxed text-slate-100">{task.description}</p>
              <div className="mt-2 flex items-center gap-2 text-[8px] text-slate-400 font-bold uppercase tracking-wider italic">
                <Clock size={10} /> Cumulative: {tasks.slice(0, idx + 1).reduce((sum, t) => sum + t.estimatedMinutes, 0)}m into shift
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900"></div>
            </div>
          </motion.div>
        ))}
        {totalMinutes < shiftLimit && (
          <div className="h-full bg-slate-100/30 flex-1 backdrop-blur-[2px] relative border-dashed border-l border-slate-200">
             <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <span className="text-[9px] font-bold text-slate-400 italic">Unassigned: {shiftLimit - totalMinutes}m</span>
             </div>
          </div>
        )}
        
        {/* Hour Markers for Reference */}
        <div className="absolute inset-x-0 bottom-0 top-0 flex justify-between pointer-events-none px-0.5">
           {[1, 2, 3, 4, 5, 6, 7].map(h => (
              <div key={h} className="h-full w-px bg-slate-900/[0.03] relative">
                 <span className="absolute bottom-1 left-0.5 text-[7px] font-bold text-slate-300 opacity-60 font-mono tracking-tighter">{h}h</span>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [building, setBuilding] = useState<Building>({
    id: Math.random().toString(36).substr(2, 9),
    name: '',
    location: '',
    address: '',
    numFloors: 1,
    rooms: [],
    lastModified: Date.now(),
    laborRates: { ...DEFAULT_LABOR_RATES }
  });
  const [savedBuildings, setSavedBuildings] = useState<Building[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'results' | 'saved' | 'visual' | 'floorcare' | 'services' | 'standards' | 'resources' | 'lidar' | 'admin' | 'labor'>('setup');
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const sessionSaved = sessionStorage.getItem('medama_itrak_current_user');
    const localSaved = localStorage.getItem('medama_itrak_current_user');
    return (sessionSaved ? JSON.parse(sessionSaved) : null) || (localSaved ? JSON.parse(localSaved) : null);
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('medama_itrak_auth') === 'true' || localStorage.getItem('medama_itrak_auth') === 'true';
  });
  const [appPasscode, setAppPasscode] = useState('1234');
  const [loginInput, setLoginInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  const [expandedOutliers, setExpandedOutliers] = useState<Record<string, boolean>>({});
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isLidarOpen, setIsLidarOpen] = useState(false);
  const [lidarScans, setLidarScans] = useState<LidarScan[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const passcodeHydratedRef = useRef(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [lidarSaveStatus, setLidarSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingScanId, setEditingScanId] = useState<string | null>(null);
  const [viewing3DScans, setViewing3DScans] = useState<LidarScan[] | null>(null);
  const [highlightedObjectLabel, setHighlightedObjectLabel] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LidarScan>>({});
  const [qrCodeScanId, setQrCodeScanId] = useState<string | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterType, setRoomFilterType] = useState<string>('All');
  const [roomFilterFloor, setRoomFilterFloor] = useState<string>('All');
  const [lidarSearchQuery, setLidarSearchQuery] = useState('');
  const [lidarFilterType, setLidarFilterType] = useState<string>('All');
  const [lidarFilterDate, setLidarFilterDate] = useState<string>('All');
  const [lidarFilterStartDate, setLidarFilterStartDate] = useState<string>('');
  const [lidarFilterEndDate, setLidarFilterEndDate] = useState<string>('');
  const [lidarFilterObject, setLidarFilterObject] = useState<string>('');
  const [lidarFilterConfidence, setLidarFilterConfidence] = useState<number>(0);
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3-flash-preview' | 'gemini-1.5-pro' | 'gemini-1.5-flash'>('gemini-3-flash-preview');
  const [newUserForm, setNewUserForm] = useState<Partial<UserProfile>>({
    name: '',
    passcode: '',
    role: UserRole.VIEWER,
    accessibleBuildingIds: []
  });
  const [editingTask, setEditingTask] = useState<ShiftTask | null>(null);
  const [newTaskForm, setNewTaskForm] = useState<{
    description: string;
    estimatedMinutes: number;
    shift: 'day' | 'evening' | 'night' | null;
  }>({
    description: '',
    estimatedMinutes: 0,
    shift: null
  });
  const proposalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setStorageError(null);
    fetchBootstrap()
      .then((data) => {
        if (cancelled) return;
        setSavedBuildings(Array.isArray(data.buildings) ? data.buildings : []);
        setUserProfiles(Array.isArray(data.userProfiles) ? data.userProfiles : []);
        setLidarScans(Array.isArray(data.lidarScans) ? data.lidarScans : []);
        setAppPasscode(typeof data.passcode === 'string' && data.passcode ? data.passcode : '1234');
        passcodeHydratedRef.current = false;
        setStorageReady(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setStorageError(err instanceof Error ? err.message : 'Failed to load data from server');
          setStorageReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || storageError) return;
    saveBuildings(savedBuildings).catch((e) => console.error('Failed to persist buildings', e));
  }, [savedBuildings, storageReady, storageError]);

  useEffect(() => {
    if (!storageReady || storageError) return;
    saveLidarScans(lidarScans).catch((e) => console.error('Failed to persist LiDAR scans', e));
  }, [lidarScans, storageReady, storageError]);

  useEffect(() => {
    if (!storageReady || storageError) return;
    saveUserProfiles(userProfiles).catch((e) => console.error('Failed to persist user profiles', e));
  }, [userProfiles, storageReady, storageError]);

  useEffect(() => {
    if (!storageReady || storageError) return;
    if (!passcodeHydratedRef.current) {
      passcodeHydratedRef.current = true;
      return;
    }
    const t = window.setTimeout(() => {
      savePasscode(appPasscode).catch((e) => console.error('Failed to persist passcode', e));
    }, 400);
    return () => window.clearTimeout(t);
  }, [appPasscode, storageReady, storageError]);

  const handleLogin = () => {
    // Check user profiles first
    const profile = userProfiles.find(p => p.passcode === loginInput);
    
    if (profile) {
      setCurrentUser(profile);
      setIsLoggedIn(true);
      if (rememberMe) {
        localStorage.setItem('medama_itrak_auth', 'true');
        localStorage.setItem('medama_itrak_current_user', JSON.stringify(profile));
      } else {
        sessionStorage.setItem('medama_itrak_auth', 'true');
        sessionStorage.setItem('medama_itrak_current_user', JSON.stringify(profile));
      }
      setLoginError(false);
      return;
    }

    // Fallback to master passcode
    if (loginInput === appPasscode) {
      const adminProfile: UserProfile = {
        id: 'master-admin',
        name: 'Master Admin',
        passcode: appPasscode,
        role: UserRole.ADMIN,
        accessibleBuildingIds: [],
        createdAt: Date.now()
      };
      setCurrentUser(adminProfile);
      setIsLoggedIn(true);
      if (rememberMe) {
        localStorage.setItem('medama_itrak_auth', 'true');
        localStorage.setItem('medama_itrak_current_user', JSON.stringify(adminProfile));
      } else {
        sessionStorage.setItem('medama_itrak_auth', 'true');
        sessionStorage.setItem('medama_itrak_current_user', JSON.stringify(adminProfile));
      }
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginInput('');
    sessionStorage.removeItem('medama_itrak_auth');
    sessionStorage.removeItem('medama_itrak_current_user');
    localStorage.removeItem('medama_itrak_auth');
    localStorage.removeItem('medama_itrak_current_user');
    setActiveTab('setup');
  };

  const addShiftTask = (shift: 'day' | 'evening' | 'night') => {
    if (!newTaskForm.description || newTaskForm.estimatedMinutes <= 0) return;
    
    const newTask: ShiftTask = {
      id: Math.random().toString(36).substr(2, 9),
      description: newTaskForm.description,
      estimatedMinutes: newTaskForm.estimatedMinutes,
      shift
    };
    
    setBuilding(prev => ({
      ...prev,
      shiftTasks: [...(prev.shiftTasks || []), newTask]
    }));
    
    setNewTaskForm({ description: '', estimatedMinutes: 0, shift: null });
  };

  const updateShiftTask = (updatedTask: ShiftTask) => {
    setBuilding(prev => ({
      ...prev,
      shiftTasks: (prev.shiftTasks || []).map(t => t.id === updatedTask.id ? updatedTask : t)
    }));
    setEditingTask(null);
  };

  const removeShiftTask = (taskId: string) => {
    setBuilding(prev => ({
      ...prev,
      shiftTasks: (prev.shiftTasks || []).filter(t => t.id !== taskId)
    }));
  };

  const accessibleBuildings = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.ADMIN) return savedBuildings;
    if (currentUser.accessibleBuildingIds.length === 0) return [];
    return savedBuildings.filter(b => currentUser.accessibleBuildingIds.includes(b.id));
  }, [savedBuildings, currentUser]);

  const roomsByFloor = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    
    const filteredRooms = building.rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                           room.type.toLowerCase().includes(roomSearchQuery.toLowerCase()) ||
                           (room.outliers || '').toLowerCase().includes(roomSearchQuery.toLowerCase());
      
      const matchesType = roomFilterType === 'All' || room.type === roomFilterType;
      const matchesFloor = roomFilterFloor === 'All' || room.floor === roomFilterFloor;
      
      return matchesSearch && matchesType && matchesFloor;
    });

    filteredRooms.forEach(room => {
      const floor = room.floor || '1';
      if (!groups[floor]) groups[floor] = [];
      groups[floor].push(room);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [building.rooms, roomSearchQuery, roomFilterType, roomFilterFloor]);

  const filteredLidarScans = useMemo(() => {
    return lidarScans.filter(scan => {
      const matchesSearch = scan.roomName.toLowerCase().includes(lidarSearchQuery.toLowerCase()) ||
                           scan.id.toLowerCase().includes(lidarSearchQuery.toLowerCase()) ||
                           scan.detectedObjects.some(obj => obj.toLowerCase().includes(lidarSearchQuery.toLowerCase()));
      
      const matchesType = lidarFilterType === 'All' || scan.roomType === lidarFilterType;
      
      const scanDate = new Date(scan.timestamp);
      const now = new Date();
      let matchesDate = true;
      if (lidarFilterDate === 'today') {
        matchesDate = scanDate.toDateString() === now.toDateString();
      } else if (lidarFilterDate === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = scanDate >= weekAgo;
      } else if (lidarFilterDate === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = scanDate >= monthAgo;
      } else if (lidarFilterDate === 'custom') {
        const start = lidarFilterStartDate ? new Date(lidarFilterStartDate) : null;
        const end = lidarFilterEndDate ? new Date(lidarFilterEndDate) : null;
        if (start && end) {
          // Set end to end of day
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = scanDate >= start && scanDate <= endOfDay;
        } else if (start) {
          matchesDate = scanDate >= start;
        } else if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = scanDate <= endOfDay;
        }
      }
      
      const matchesConfidence = scan.confidence >= lidarFilterConfidence / 100;
      
      const matchesObject = !lidarFilterObject || 
                           scan.detectedObjects.some(obj => obj.toLowerCase().includes(lidarFilterObject.toLowerCase()));
      
      return matchesSearch && matchesType && matchesDate && matchesConfidence && matchesObject;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [lidarScans, lidarSearchQuery, lidarFilterType, lidarFilterDate, lidarFilterStartDate, lidarFilterEndDate, lidarFilterConfidence, lidarFilterObject]);

  const toggleFloor = (floor: string) => {
    setExpandedFloors(prev => ({ ...prev, [floor]: !prev[floor] }));
  };

  const downloadProposal = async () => {
    if (!proposalRef.current) return;
    setIsGeneratingPDF(true);
    
    try {
      // Small delay to ensure any animations settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(proposalRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc',
        windowWidth: 1200, // Force a consistent width for the capture
        onclone: (clonedDoc) => {
          // html2canvas doesn't support modern color functions like oklch/oklab (Tailwind v4 default)
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            const isModernColor = (color: string) => color && (color.includes('oklch') || color.includes('oklab'));
            
            // List of properties that might contain colors
            const colorProps = ['color', 'backgroundColor', 'borderColor', 'boxShadow', 'outlineColor', 'stopColor', 'fill', 'stroke', 'backdropFilter', 'filter'];
            
            colorProps.forEach(prop => {
              const value = (style as any)[prop];
              if (isModernColor(value)) {
                if (prop === 'boxShadow') {
                  el.style.boxShadow = 'none';
                } else if (prop === 'backgroundColor') {
                  // Map common background classes to safe RGB
                  if (el.classList.contains('bg-indigo-600')) el.style.backgroundColor = 'rgb(79, 70, 229)';
                  else if (el.classList.contains('bg-emerald-50')) el.style.backgroundColor = 'rgb(236, 253, 245)';
                  else if (el.classList.contains('bg-indigo-50')) el.style.backgroundColor = 'rgb(238, 242, 255)';
                  else if (el.classList.contains('bg-slate-900')) el.style.backgroundColor = 'rgb(15, 23, 42)';
                  else el.style.backgroundColor = 'rgb(255, 255, 255)';
                } else if (prop === 'color') {
                  el.style.color = 'rgb(15, 23, 42)';
                } else {
                  (el.style as any)[prop] = 'inherit';
                }
              }
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Medama_iTrak_Proposal.pdf');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      // Fallback to print if canvas fails
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Deep linking for QR codes (scanId parameter)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scanId');
    if (scanId && lidarScans.length > 0) {
      const scan = lidarScans.find(s => s.id === scanId);
      if (scan) {
        setViewing3DScans([scan]);
        setActiveTab('lidar');
        // Clear the param after handling to prevent re-opening
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [lidarScans]);

  const saveLidarScansManually = () => {
    setLidarSaveStatus('saving');
    saveLidarScans(lidarScans)
      .then(() => {
        setLidarSaveStatus('saved');
        setTimeout(() => setLidarSaveStatus('idle'), 2000);
      })
      .catch((e) => {
        console.error(e);
        setLidarSaveStatus('idle');
      });
  };

  const startEditingScan = (scan: LidarScan) => {
    setEditingScanId(scan.id);
    setEditForm({
      roomName: scan.roomName,
      roomType: scan.roomType,
      squareFootage: scan.squareFootage,
      volume: scan.volume || 0,
      detectedObjects: [...scan.detectedObjects],
      notes: scan.notes || ''
    });
  };

  const saveScanEdit = (id: string) => {
    setLidarScans(prev => prev.map(scan => 
      scan.id === id ? { ...scan, ...editForm, timestamp: Date.now() } : scan
    ));
    setEditingScanId(null);
    setEditForm({});
  };

  const cancelScanEdit = () => {
    setEditingScanId(null);
    setEditForm({});
  };

  const batchReanalyze = async () => {
    if (selectedScanIds.length === 0) return;
    setIsBatchConfirmOpen(false);
    setIsBatchAnalyzing(true);
    
    try {
      const updatedScans = [...lidarScans];
      
      for (const scanId of selectedScanIds) {
        const scanIndex = updatedScans.findIndex(s => s.id === scanId);
        if (scanIndex === -1) continue;
        
        const scan = updatedScans[scanIndex];
        
        if (scan.imageUrl.startsWith('data:image')) {
          const [header, data] = scan.imageUrl.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          // Pass the selected model to the analysis service
          const results = await analyzeLidarMap(data, mimeType, selectedModel);
          
          if (results && results.length > 0) {
            const result = results[0];
            updatedScans[scanIndex] = {
              ...scan,
              timestamp: Date.now(),
              roomType: result.roomType || scan.roomType,
              squareFootage: result.squareFootage || scan.squareFootage,
              volume: result.volume || scan.volume,
              detectedObjects: result.detectedObjects || scan.detectedObjects,
              productivityPenalty: result.productivityPenalty ?? scan.productivityPenalty,
              aiReasoning: result.aiReasoning || scan.aiReasoning,
              highlights: result.highlights || scan.highlights,
              pointCloudData: result.pointCloudData || scan.pointCloudData,
              confidence: result.confidence || scan.confidence,
              status: 'processed'
            };
          }
        } else {
          // Simulation for non-base64 images
          await new Promise(resolve => setTimeout(resolve, 1000));
          updatedScans[scanIndex] = {
            ...scan,
            timestamp: Date.now(),
            confidence: Math.min(0.99, scan.confidence + 0.05),
            aiReasoning: `Re-analyzed with ${selectedModel}. ${scan.aiReasoning}`
          };
        }
      }
      
      setLidarScans(updatedScans);
      setSelectedScanIds([]);
    } catch (error) {
      console.error("Batch re-analysis failed", error);
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const batchExport = (scansToExport?: LidarScan[]) => {
    const selectedScans = scansToExport || lidarScans.filter(s => selectedScanIds.includes(s.id));
    if (selectedScans.length === 0) return;

    const headers = ["ID", "Room", "Type", "Area", "Volume", "Objects", "Penalty", "Confidence", "Timestamp"];
    const rows = selectedScans.map(s => [
      s.id,
      s.roomName,
      s.roomType,
      s.squareFootage,
      s.volume || 0,
      s.detectedObjects.join('; '),
      s.productivityPenalty || 0,
      s.confidence,
      new Date(s.timestamp).toLocaleString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lidar_scans_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateEditForm = (updates: Partial<LidarScan>) => {
    setEditForm(prev => ({ ...prev, ...updates }));
  };

  const results = useMemo(() => calculateRequirements(building.rooms, building.shiftTasks), [building.rooms, building.shiftTasks]);

  const laborCosts = useMemo(() => {
    const rates = building.laborRates || DEFAULT_LABOR_RATES;
    
    // Weekly hours across different domains
    const weeklyCleanerHours = results.dailyCleaningFte * HOURS_PER_FTE_WEEK;
    const weeklyFloorCareHours = results.annualFloorCareFte * HOURS_PER_FTE_WEEK;
    const weeklyManagerHours = results.managersRequired * HOURS_PER_FTE_WEEK;

    // Weekly Base Costs (Wages only)
    const cleanerWeek = weeklyCleanerHours * rates.cleanerHourlyRate;
    const floorCareWeek = weeklyFloorCareHours * rates.floorCareHourlyRate;
    const managerWeek = weeklyManagerHours * rates.managerHourlyRate;

    const subtotalWeek = cleanerWeek + floorCareWeek + managerWeek;
    const totalWeek = subtotalWeek * rates.taxBenefitsMultiplier;

    return {
      cleanerWeek,
      floorCareWeek,
      managerWeek,
      subtotalWeek,
      totalWeek,
      taxesWeek: totalWeek - subtotalWeek,
      rates
    };
  }, [results, building.laborRates]);

  const createNewBuilding = () => {
    setBuilding({
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      location: '',
      address: '',
      numFloors: 1,
      rooms: [],
      lastModified: Date.now()
    });
    setActiveTab('setup');
  };

  const saveBuilding = () => {
    if (!building.name.trim()) {
      alert("Please enter a building name before saving.");
      return;
    }
    
    setSaveStatus('saving');
    const updatedBuilding = { ...building, lastModified: Date.now() };
    
    setSavedBuildings(prev => {
      const exists = prev.find(b => b.id === building.id);
      if (exists) {
        return prev.map(b => b.id === building.id ? updatedBuilding : b);
      }
      return [updatedBuilding, ...prev];
    });
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const exportBuildingComprehensiveData = (b: Building) => {
    const stats = calculateRequirements(b.rooms, b.shiftTasks || []);
    
    const rows = [
      ["COMPREHENSIVE FACILITY ANALYSIS REPORT"],
      ["Generated", new Date().toLocaleString()],
      [""],
      ["BUILDING SUMMARY"],
      ["Building Name", b.name || "Untitled"],
      ["Location", b.location || "N/A"],
      ["Last Modified", new Date(b.lastModified).toLocaleString()],
      ["Total Rooms", stats.totalRooms],
      ["Total Area (Sq Ft)", stats.totalSquareFootage],
      ["Total Weekly Cleaning Hours", stats.totalCleaningHoursPerWeek.toFixed(2)],
      ["Total Annual Floor Care Hours", stats.totalAnnualFloorCareHours.toFixed(2)],
      ["Total FTE Required", stats.fteRequired.toFixed(2)],
      ["Management Required (FTE)", stats.managersRequired.toFixed(2)],
      [""],
      ["ROOM BREAKDOWN"],
      ["Name", "Type", "Floor", "Square Footage", "Flooring Type", "Weekly Cleaning Hours", "Productivity Penalty", "Detected Objects"]
    ];

    b.rooms.forEach(room => {
      let baseRate = CLEANING_RATES[room.type] || 25;
      if (room.assignedEquipment && room.assignedEquipment.length > 0) {
        const bestProductivity = Math.min(...room.assignedEquipment.map(eq => EQUIPMENT_PRODUCTIVITY[eq] || 1.0));
        baseRate *= bestProductivity;
      }
      if (room.productivityPenalty) {
        baseRate *= (1 + (room.productivityPenalty / 100));
      }
      let weeklyHours = 0;
      if (room.serviceFrequencies) {
         Object.entries(room.serviceFrequencies).forEach(([service, freq]) => {
          const multiplier = SERVICE_MULTIPLIERS[service as ServiceType] || 1.0;
          weeklyHours += (room.squareFootage / 1000) * (baseRate * multiplier / 60) * freq;
        });
      } else {
        weeklyHours = (room.squareFootage / 1000) * (baseRate / 60) * (room.cleaningFrequency || 0);
      }

      rows.push([
        room.name,
        room.type,
        room.floor || "1",
        room.squareFootage,
        room.flooringType || DEFAULT_FLOORING[room.type] || "Standard", 
        weeklyHours.toFixed(2),
        `${room.productivityPenalty || 0}%`,
        room.outliers || ""
      ]);
    });

    rows.push([""]);
    rows.push(["LABOR BREAKDOWN BY SHIFT"]);
    rows.push(["Shift", "Cleaning FTE", "Managers Required", "Tasks Count"]);
    Object.entries(stats.breakdownByShift).forEach(([shift, data]) => {
      rows.push([
        shift.toUpperCase(),
        data.fte.toFixed(2),
        data.managers.toFixed(2),
        (data.assignedTasks || []).length
      ]);
    });

    rows.push([""]);
    rows.push(["FLOORING BREAKDOWN"]);
    rows.push(["Type", "Square Footage", "FTE Required", "Annual Floor Care Hours"]);
    Object.entries(stats.breakdownByFlooring).forEach(([type, data]) => {
      rows.push([
        type,
        data.squareFootage,
        data.fte.toFixed(2),
        data.annualFloorCareHours.toFixed(2)
      ]);
    });

    rows.push([""]);
    rows.push(["LABOR COST PROJECTIONS"]);
    const rates = b.laborRates || DEFAULT_LABOR_RATES;
    const weeklyCleanerHours = stats.dailyCleaningFte * HOURS_PER_FTE_WEEK;
    const weeklyFloorCareHours = stats.annualFloorCareFte * HOURS_PER_FTE_WEEK;
    const weeklyManagerHours = stats.managersRequired * HOURS_PER_FTE_WEEK;

    const cleanerWeek = weeklyCleanerHours * rates.cleanerHourlyRate;
    const floorCareWeek = weeklyFloorCareHours * rates.floorCareHourlyRate;
    const managerWeek = weeklyManagerHours * rates.managerHourlyRate;
    const subtotalWeek = cleanerWeek + floorCareWeek + managerWeek;
    const totalWeek = subtotalWeek * rates.taxBenefitsMultiplier;

    rows.push(["Cost Category", "Hourly Rate", "Weekly Wages", "Annual Wages"]);
    rows.push(["Cleaning Staff", `$${rates.cleanerHourlyRate.toFixed(2)}`, `$${cleanerWeek.toFixed(2)}`, `$${(cleanerWeek * 52).toFixed(2)}`]);
    rows.push(["Floor Care Staff", `$${rates.floorCareHourlyRate.toFixed(2)}`, `$${floorCareWeek.toFixed(2)}`, `$${(floorCareWeek * 52).toFixed(2)}`]);
    rows.push(["Management", `$${rates.managerHourlyRate.toFixed(2)}`, `$${managerWeek.toFixed(2)}`, `$${(managerWeek * 52).toFixed(2)}`]);
    rows.push(["Subtotal (Base Wages)", "", `$${subtotalWeek.toFixed(2)}`, `$${(subtotalWeek * 52).toFixed(2)}`]);
    rows.push(["Taxes & Benefits Overhead", `${((rates.taxBenefitsMultiplier - 1) * 100).toFixed(0)}%`, `$${(totalWeek - subtotalWeek).toFixed(2)}`, `$${((totalWeek - subtotalWeek) * 52).toFixed(2)}`]);
    rows.push(["TOTAL FULLY BURDENED COST", "", `$${totalWeek.toFixed(2)}`, `$${(totalWeek * 52).toFixed(2)}`]);

    const csvContent = rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(b.name || 'building').replace(/\s+/g, '_').toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadBuilding = (b: Building) => {
    setBuilding(b);
    setActiveTab('setup');
  };

  const deleteSavedBuilding = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this building?")) {
      setSavedBuildings(prev => prev.filter(b => b.id !== id));
    }
  };

  const addRoom = () => {
    setIsBulkAddOpen(true);
  };

  const handleBulkAdd = (newRooms: Room[]) => {
    setBuilding(prev => ({ ...prev, rooms: [...prev.rooms, ...newRooms] }));
    
    // Automatically expand the floors that were added
    const floorsToExpand = [...new Set(newRooms.map(r => r.floor || '1'))];
    setExpandedFloors(prev => {
      const next = { ...prev };
      floorsToExpand.forEach(f => { next[f] = true; });
      return next;
    });
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setBuilding(prev => ({
      ...prev,
      rooms: prev.rooms.map(r => {
        if (r.id === id) {
          const newRoom = { ...r, ...updates };
          // If type changed, update flooring to default for that type
          if (updates.type && updates.type !== r.type) {
            newRoom.flooringType = DEFAULT_FLOORING[updates.type] || FlooringType.VCT;
            newRoom.assignedEquipment = DEFAULT_EQUIPMENT[updates.type] || [EquipmentType.MOP_BUCKET];
            newRoom.serviceFrequencies = DEFAULT_SERVICES[updates.type] || { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 };
            newRoom.serviceOutliers = [];
          }
          return newRoom;
        }
        return r;
      })
    }));
  };

  const exportRoomToCSV = (room: Room) => {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Room ID', room.id],
      ['Room Name', room.name],
      ['Floor', room.floor],
      ['Department', room.department || 'N/A'],
      ['Room Type', room.type],
      ['Flooring Type', room.flooringType],
      ['Square Footage', room.squareFootage],
      ['Productivity Penalty', `${room.productivityPenalty || 0}%`],
      ['Outliers', room.outliers || 'None'],
      ['Assigned Equipment', (room.assignedEquipment || []).join('; ')],
      ['Regular Clean Frequency', room.serviceFrequencies?.[ServiceType.REGULAR] || 0],
      ['Terminal Clean Frequency', room.serviceFrequencies?.[ServiceType.TERMINAL] || 0],
      ['Cycle Clean Frequency', room.serviceFrequencies?.[ServiceType.CYCLE] || 0],
      ['Policing Frequency', room.serviceFrequencies?.[ServiceType.POLICE] || 0],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Room_${room.name.replace(/\s+/g, '_')}_Details.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeRoom = (id: string) => {
    setBuilding(prev => ({
      ...prev,
      rooms: prev.rooms.filter(r => r.id !== id)
    }));
  };

  const addExtractedRooms = (extracted: Partial<Room>[]) => {
    const roomsWithIds: Room[] = extracted.map(r => {
      const type = r.type || RoomType.OTHER;
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: r.name || 'Extracted Room',
        floor: r.floor || '1',
        department: r.department || '',
        type: type,
        flooringType: DEFAULT_FLOORING[type] || FlooringType.VCT,
        assignedEquipment: DEFAULT_EQUIPMENT[type] || [EquipmentType.MOP_BUCKET],
        serviceFrequencies: DEFAULT_SERVICES[type] || { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
        serviceOutliers: [],
        squareFootage: r.squareFootage || 0,
        cleaningFrequency: 5,
        outliers: r.outliers,
        productivityPenalty: (r as any).productivityPenalty
      };
    });
    setBuilding(prev => ({ ...prev, rooms: [...prev.rooms, ...roomsWithIds] }));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsAnalyzing(true);
    try {
      for (const file of acceptedFiles) {
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel') {
          const extractedRooms = await parseExcelFile(file);
          const roomsWithIds: Room[] = extractedRooms.map(r => {
            const type = r.type || RoomType.OTHER;
            return {
              id: Math.random().toString(36).substr(2, 9),
              name: r.name || 'Unnamed Room',
              floor: r.floor || '1',
              department: r.department || '',
              type: type,
              flooringType: DEFAULT_FLOORING[type] || FlooringType.VCT,
              assignedEquipment: DEFAULT_EQUIPMENT[type] || [EquipmentType.MOP_BUCKET],
              serviceFrequencies: DEFAULT_SERVICES[type] || { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
              serviceOutliers: [],
              squareFootage: r.squareFootage || 0,
              cleaningFrequency: 5,
              outliers: r.outliers
            };
          });
          setBuilding(prev => ({ ...prev, rooms: [...prev.rooms, ...roomsWithIds] }));
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const extracted = await analyzeRoomImage(base64, file.type);
            const roomsWithIds: Room[] = extracted.map(r => {
              const type = r.type || RoomType.OTHER;
              return {
                id: Math.random().toString(36).substr(2, 9),
                name: r.name || 'Extracted Room',
                floor: r.floor || '1',
                department: r.department || '',
                type: type,
                flooringType: DEFAULT_FLOORING[type] || FlooringType.VCT,
                assignedEquipment: DEFAULT_EQUIPMENT[type] || [EquipmentType.MOP_BUCKET],
                serviceFrequencies: DEFAULT_SERVICES[type] || { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
                serviceOutliers: [],
                squareFootage: r.squareFootage || 0,
                cleaningFrequency: 5,
                outliers: r.outliers
              };
            });
            setBuilding(prev => ({ ...prev, rooms: [...prev.rooms, ...roomsWithIds] }));
          };
          reader.readAsDataURL(file);
        }
      }
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  } as any);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {!isLoggedIn ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full glass-card p-8 space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Medama ITRAK</h1>
              <p className="text-slate-500">Please enter your passcode to access the system</p>
            </div>

            {!storageReady ? (
              <div className="flex flex-col items-center gap-3 py-6 text-slate-600">
                <Loader2 className="animate-spin text-indigo-600" size={28} />
                <p className="text-sm font-medium">Loading workspace data…</p>
              </div>
            ) : storageError ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-red-600 font-medium">{storageError}</p>
                <p className="text-xs text-slate-500">
                  Ensure the API is running (<code className="font-mono bg-slate-100 px-1 rounded">npm run dev</code> starts it with Vite).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStorageReady(false);
                    setStorageError(null);
                    fetchBootstrap()
                      .then((data) => {
                        setSavedBuildings(Array.isArray(data.buildings) ? data.buildings : []);
                        setUserProfiles(Array.isArray(data.userProfiles) ? data.userProfiles : []);
                        setLidarScans(Array.isArray(data.lidarScans) ? data.lidarScans : []);
                        setAppPasscode(typeof data.passcode === 'string' && data.passcode ? data.passcode : '1234');
                        passcodeHydratedRef.current = false;
                        setStorageReady(true);
                        setStorageError(null);
                      })
                      .catch((err) => {
                        console.error(err);
                        setStorageError(err instanceof Error ? err.message : 'Failed to load data');
                        setStorageReady(true);
                      });
                  }}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {storageReady && !storageError && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passcode</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    value={loginInput}
                    onChange={(e) => {
                      setLoginInput(e.target.value);
                      setLoginError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="••••"
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-lg font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${loginError ? 'border-red-500' : 'border-slate-200'}`}
                  />
                </div>
                {loginError && (
                  <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> Invalid passcode. Please try again.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                    {rememberMe && <Check size={12} className="text-white" />}
                  </div>
                  <input 
                    type="checkbox"
                    className="hidden"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Remember Me</span>
                </label>
              </div>

              <button 
                onClick={handleLogin}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Access System <ChevronRight size={18} />
              </button>
            </div>
            )}

            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Authorized Personnel Only</p>
            </div>
          </motion.div>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        <AnimatePresence>
          {isBulkAddOpen && (
            <BulkAddModal 
              isOpen={isBulkAddOpen}
              onClose={() => setIsBulkAddOpen(false)}
              onAdd={handleBulkAdd}
              currentRoomCount={building.rooms.length}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {qrCodeScanId && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center space-y-6"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                      <QrCode size={18} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">Spatial Access QR</h3>
                  </div>
                  <button 
                    onClick={() => setQrCodeScanId(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-100 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <QRCodeCanvas 
                    id="lidar-qr-code"
                    value={(() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('scanId', qrCodeScanId);
                      return url.toString();
                    })()}
                    size={200}
                    level="H"
                    includeMargin={true}
                    className="relative z-10 rounded-lg bg-white p-2 shadow-sm"
                  />
                  <div className="mt-4 pt-4 border-t border-slate-200 w-full flex flex-col items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Access Token Secured</p>
                    <p className="text-[9px] font-mono text-slate-500 mt-1 truncate max-w-full italic cursor-help" title={qrCodeScanId}>ID: {qrCodeScanId}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        const canvas = document.getElementById('lidar-qr-code') as HTMLCanvasElement;
                        if (canvas) {
                          const url = canvas.toDataURL('image/png');
                          const link = document.createElement('a');
                          link.download = `lidar-scan-${qrCodeScanId}.png`;
                          link.href = url;
                          link.click();
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      <Download size={14} /> Download
                    </button>
                    <button 
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('scanId', qrCodeScanId);
                        navigator.clipboard.writeText(url.toString());
                        // Trigger simple alert or success toast
                        const btn = document.activeElement as HTMLButtonElement;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = 'Copied!';
                        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      <ArrowLeftRight size={14} /> Copy Link
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed px-2 bg-slate-50 py-3 rounded-xl border border-slate-100">
                    Scan to jump directly to the <strong>3D Spatial Inspection</strong> of this room. Great for physical entry points.
                  </p>
                  
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-left">
                    <AlertCircle className="text-amber-600 shrink-0" size={16} />
                    <p className="text-[10px] text-amber-700 leading-tight">
                      <strong>Security Note:</strong> Personnel will still be required to authenticate via passcode before spatial data is rendered.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setQrCodeScanId(null)}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                  Done
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
            {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
              <button 
                onClick={() => setActiveTab('setup')}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'setup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Building Setup
              </button>
            )}
            <button 
              onClick={() => setActiveTab('results')}
              disabled={building.rooms.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'results' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'}`}
            >
              Analysis Results
            </button>
            <button 
              onClick={() => setActiveTab('visual')}
              disabled={building.rooms.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'}`}
            >
              Building Map
            </button>
            <button 
              onClick={() => setActiveTab('floorcare')}
              disabled={building.rooms.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'floorcare' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'}`}
            >
              Floor Care
            </button>
            <button 
              onClick={() => setActiveTab('services')}
              disabled={building.rooms.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'services' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'}`}
            >
              Cleaning Services
            </button>
            <button 
              onClick={() => setActiveTab('labor')}
              disabled={building.rooms.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'labor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'}`}
            >
              Labor Analysis
            </button>
            <button 
              onClick={() => setActiveTab('lidar')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'lidar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              LiDAR Scans
            </button>
            <button 
              onClick={() => setActiveTab('standards')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'standards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Standards & Logic
            </button>
            <button 
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'resources' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Resources
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'saved' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Saved Buildings ({accessibleBuildings.length})
            </button>
            {currentUser?.role === UserRole.ADMIN && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Settings size={14} className="inline mr-1" /> Admin
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{currentUser?.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-sm font-bold transition-all border border-slate-200 hover:border-rose-100"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>

        <LidarModal 
          isOpen={isLidarOpen}
          onClose={() => setIsLidarOpen(false)}
          onRoomsExtracted={addExtractedRooms}
          onScanComplete={(scan) => {
            setLidarScans(prev => [scan, ...prev]);
          }}
        />

        {/* 3D Viewer Modal */}
        <AnimatePresence>
          {viewing3DScans && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl">
                      <Box size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-slate-900">3D Spatial Inspection</h2>
                      <p className="text-sm text-slate-500">
                        {viewing3DScans.length > 1 
                          ? `Comparing ${viewing3DScans.length} selected scans` 
                          : `Interactive reconstruction of ${viewing3DScans[0].roomName}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setViewing3DScans(null);
                      setHighlightedObjectLabel(null);
                    }}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 p-6 bg-slate-100">
                  <Lidar3DViewer 
                    scans={viewing3DScans} 
                    highlightedLabel={highlightedObjectLabel}
                  />
                </div>
                <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-400 rounded-sm" />
                      <span className="text-xs font-bold text-slate-600">Productivity Impact</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-300 rounded-sm" />
                      <span className="text-xs font-bold text-slate-600">Room Boundary</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewing3DScans(null)}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Close Inspection
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isComparing && selectedScanIds.length === 2 && (
            <LidarComparison 
              scans={lidarScans.filter(s => selectedScanIds.includes(s.id))}
              onClose={() => setIsComparing(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'setup' ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Building Info */}
              <section className="glass-card p-8">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Info size={20} />
                    </div>
                    <h2 className="text-xl font-display font-bold">Building Details</h2>
                  </div>
                  <button 
                    onClick={saveBuilding}
                    disabled={saveStatus !== 'idle'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm
                      ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                  >
                    {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={18} /> : 
                     saveStatus === 'saved' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Building'}
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Building Name</label>
                    <input 
                      type="text" 
                      value={building.name}
                      onChange={e => setBuilding(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Corporate HQ"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        value={building.location}
                        onChange={e => setBuilding(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g. New York, NY"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                    <input 
                      type="text" 
                      value={building.address || ''}
                      onChange={e => setBuilding(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g. 123 Business Ave, Suite 100"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Number of Floors</label>
                    <input 
                      type="number" 
                      value={building.numFloors || 1}
                      onChange={e => setBuilding(prev => ({ ...prev, numFloors: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* File Upload */}
              <section 
                {...getRootProps()} 
                className={`glass-card p-12 border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-4
                  ${isDragActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'}`}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                  {isAnalyzing ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold">Upload Building Data</h3>
                  <p className="text-slate-500 max-w-md mx-auto mt-1">
                    Drag & drop images of rooms, blueprints, or Excel spreadsheets. Our AI will automatically extract room details.
                  </p>
                </div>
                <div className="flex gap-4 pt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                    <ImageIcon size={14} /> IMAGES
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                    <Calculator size={14} /> BLUEPRINTS
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                    <FileSpreadsheet size={14} /> EXCEL
                  </span>
                  <button 
                    onClick={() => setIsLidarOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-all"
                  >
                    <Scan size={14} /> LIDAR SCAN
                  </button>
                </div>
              </section>

              {/* Room List */}
              <section className="glass-card overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <LayoutDashboard size={20} />
                    </div>
                    <h2 className="text-xl font-display font-bold">Room Inventory</h2>
                    {(roomSearchQuery || roomFilterType !== 'All' || roomFilterFloor !== 'All') && (
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {roomsByFloor.reduce((acc, [_, rooms]) => acc + rooms.length, 0)} results
                      </span>
                    )}
                  </div>
                  <button onClick={addRoom} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Rooms
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search rooms by name, type, or outliers..."
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filters:</span>
                    </div>
                    
                    <select 
                      value={roomFilterType}
                      onChange={(e) => setRoomFilterType(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="All">All Types</option>
                      {Object.values(RoomType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    
                    <select 
                      value={roomFilterFloor}
                      onChange={(e) => setRoomFilterFloor(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="All">All Floors</option>
                      {Array.from(new Set(building.rooms.map(r => r.floor || '1'))).sort().map(floor => (
                        <option key={floor} value={floor}>Floor {floor}</option>
                      ))}
                    </select>
                    
                    {(roomSearchQuery || roomFilterType !== 'All' || roomFilterFloor !== 'All') && (
                      <button 
                        onClick={() => {
                          setRoomSearchQuery('');
                          setRoomFilterType('All');
                          setRoomFilterFloor('All');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Flooring</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Floor</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sq Ft</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Services/Wk</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outliers</th>
                        <th className="px-8 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roomsByFloor.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-8 py-12 text-center text-slate-400 italic">
                            {building.rooms.length === 0 
                              ? "No rooms added yet. Upload files or click \"Add Room\" to begin."
                              : "No rooms match your search or filter criteria."}
                          </td>
                        </tr>
                      ) : (
                        roomsByFloor.map(([floor, floorRooms]) => (
                          <React.Fragment key={floor}>
                            <tr 
                              className="bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => toggleFloor(floor)}
                            >
                              <td colSpan={8} className="px-8 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`transition-transform duration-200 ${expandedFloors[floor] ? 'rotate-90' : ''}`}>
                                    <ChevronRight size={16} className="text-slate-400" />
                                  </div>
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Floor {floor}</span>
                                  <span className="text-[10px] bg-white border border-slate-200 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                    {floorRooms.length} Rooms
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {((expandedFloors[floor] || roomSearchQuery || roomFilterType !== 'All' || roomFilterFloor !== 'All')) && floorRooms.map(room => (
                              <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-4">
                                  <input 
                                    type="text" 
                                    value={room.name}
                                    onChange={e => updateRoom(room.id, { name: e.target.value })}
                                    className="bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-900 w-full"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <select 
                                    value={room.type}
                                    onChange={e => updateRoom(room.id, { type: e.target.value as RoomType })}
                                    className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 text-sm cursor-pointer"
                                  >
                                    {Object.values(RoomType).map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <select 
                                    value={room.flooringType}
                                    onChange={e => updateRoom(room.id, { flooringType: e.target.value as FlooringType })}
                                    className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 text-sm cursor-pointer"
                                  >
                                    {Object.values(FlooringType).map(f => (
                                      <option key={f} value={f}>{f}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="text" 
                                    value={room.floor}
                                    onChange={e => updateRoom(room.id, { floor: e.target.value })}
                                    className="bg-transparent border-none focus:ring-0 p-0 text-slate-600 text-sm w-12"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <input 
                                      type="number" 
                                      value={room.squareFootage}
                                      onChange={e => updateRoom(room.id, { squareFootage: Number(e.target.value) })}
                                      className={`bg-transparent border-none focus:ring-0 p-0 text-sm w-20 font-mono ${room.squareFootage === 0 ? 'text-rose-500 font-bold' : 'text-slate-600'}`}
                                    />
                                    {room.squareFootage === 0 && (
                                      <span className="text-[10px] text-rose-400 font-bold">Missing Area</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-mono text-slate-600">
                                      {(Object.values(room.serviceFrequencies || {}) as number[]).reduce((a, b) => a + b, 0)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Total</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <input 
                                    type="text" 
                                    value={room.outliers || ''}
                                    onChange={e => updateRoom(room.id, { outliers: e.target.value })}
                                    placeholder="None"
                                    className="bg-transparent border-none focus:ring-0 p-0 text-slate-400 text-sm italic w-full"
                                  />
                                </td>
                                <td className="px-8 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => exportRoomToCSV(room)}
                                      className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                                      title="Export Room Details to CSV"
                                    >
                                      <Download size={18} />
                                    </button>
                                    <button 
                                      onClick={() => removeRoom(room.id)}
                                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                      title="Delete Room"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex justify-end">
                <button 
                  onClick={() => setActiveTab('results')}
                  disabled={building.rooms.length === 0}
                  className="btn-primary flex items-center gap-2 px-10 py-4 text-lg"
                >
                  Calculate Requirements <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'labor' ? (
            <motion.div 
              key="labor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Configuration Panel */}
                <div className="w-full lg:w-1/3 space-y-6">
                  <div className="glass-card p-6 border-indigo-100 bg-indigo-50/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Settings size={64} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-indigo-600" /> Labor Rate Settings
                    </h3>
                    
                    <div className="space-y-8">
                      {/* Cleaner Rate */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Cleaning Specialist</label>
                          <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <span className="text-sm font-bold text-indigo-600">${laborCosts.rates.cleanerHourlyRate.toFixed(2)}<span className="text-[10px] text-slate-400 font-normal ml-0.5">/hr</span></span>
                          </div>
                        </div>
                        <input 
                          type="range" min="15" max="45" step="0.25"
                          value={laborCosts.rates.cleanerHourlyRate}
                          onChange={(e) => setBuilding(prev => ({ 
                            ...prev, 
                            laborRates: { ...(prev.laborRates || DEFAULT_LABOR_RATES), cleanerHourlyRate: parseFloat(e.target.value) } 
                          }))}
                          className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {/* Floor Care Rate */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Floor Care Specialist</label>
                          <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <span className="text-sm font-bold text-indigo-600">${laborCosts.rates.floorCareHourlyRate.toFixed(2)}<span className="text-[10px] text-slate-400 font-normal ml-0.5">/hr</span></span>
                          </div>
                        </div>
                        <input 
                          type="range" min="18" max="55" step="0.25"
                          value={laborCosts.rates.floorCareHourlyRate}
                          onChange={(e) => setBuilding(prev => ({ 
                            ...prev, 
                            laborRates: { ...(prev.laborRates || DEFAULT_LABOR_RATES), floorCareHourlyRate: parseFloat(e.target.value) } 
                          }))}
                          className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {/* Manager Rate */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Facility Manager</label>
                          <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <span className="text-sm font-bold text-indigo-600">${laborCosts.rates.managerHourlyRate.toFixed(2)}<span className="text-[10px] text-slate-400 font-normal ml-0.5">/hr</span></span>
                          </div>
                        </div>
                        <input 
                          type="range" min="25" max="85" step="1"
                          value={laborCosts.rates.managerHourlyRate}
                          onChange={(e) => setBuilding(prev => ({ 
                            ...prev, 
                            laborRates: { ...(prev.laborRates || DEFAULT_LABOR_RATES), managerHourlyRate: parseFloat(e.target.value) } 
                          }))}
                          className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div className="pt-6 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Taxes & Benefits</label>
                          <span className="text-sm font-bold text-slate-900">{((laborCosts.rates.taxBenefitsMultiplier - 1) * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range" min="1.1" max="1.6" step="0.01"
                          value={laborCosts.rates.taxBenefitsMultiplier}
                          onChange={(e) => setBuilding(prev => ({ 
                            ...prev, 
                            laborRates: { ...(prev.laborRates || DEFAULT_LABOR_RATES), taxBenefitsMultiplier: parseFloat(e.target.value) } 
                          }))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                        />
                        <p className="mt-2 text-[10px] text-slate-400 italic">Expected payroll tax, health insurance, and administrative overhead.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-left">
                    <Info className="text-amber-600 shrink-0" size={18} />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Costs are calculated based on a 40-hour work week per FTE. Shift differentials are not included in this high-level projection.
                    </p>
                  </div>
                </div>

                {/* Projection View */}
                <div className="w-full lg:w-2/3 space-y-6 text-left">
                  {/* Total Annual Cost Card */}
                  <div className="glass-card p-8 bg-slate-900 border-slate-800 text-white relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                      <DollarSign size={160} />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Annual Labor Investment</p>
                        <h2 className="text-5xl font-display font-bold">
                          ${(laborCosts.totalWeek * 52).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h2>
                        <div className="mt-4 flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                            <p className="text-sm text-slate-300 font-medium">${laborCosts.totalWeek.toLocaleString(undefined, { maximumFractionDigits: 0 })} / week</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <p className="text-sm text-slate-300 font-medium">${(laborCosts.totalWeek * 4.33).toLocaleString(undefined, { maximumFractionDigits: 0 })} / mo</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 inline-block text-[10px] font-bold uppercase tracking-widest mb-4">
                          Comprehensive Proj.
                        </div>
                        <p className="text-slate-400 text-[10px] leading-tight max-w-[140px] italic">Based on {results.fteRequired.toFixed(1)} calculated FTE requirements.</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Breakdown */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                      <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" /> Domain Breakdown (Weekly)
                      </h4>
                      <div className="space-y-6">
                        {/* Daily Cleaner */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600">Daily Housekeeping</span>
                            <span className="font-bold text-slate-900">${laborCosts.cleanerWeek.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(laborCosts.cleanerWeek / laborCosts.subtotalWeek) * 100}%` }}
                              className="h-full bg-indigo-600"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Projected {results.dailyCleaningFte.toFixed(1)} FTEs @ {laborCosts.rates.cleanerHourlyRate}/hr</p>
                        </div>

                        {/* Floor Care */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600">Specialized Floor Care</span>
                            <span className="font-bold text-slate-900">${laborCosts.floorCareWeek.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(laborCosts.floorCareWeek / laborCosts.subtotalWeek) * 100}%` }}
                              className="h-full bg-emerald-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Projected {results.annualFloorCareFte.toFixed(2)} FTEs @ {laborCosts.rates.floorCareHourlyRate}/hr</p>
                        </div>

                        {/* Management */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600">Management & Oversight</span>
                            <span className="font-bold text-slate-900">${laborCosts.managerWeek.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(laborCosts.managerWeek / laborCosts.subtotalWeek) * 100}%` }}
                              className="h-full bg-slate-400"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Projected {results.managersRequired.toFixed(1)} Management FTEs</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-6 border-slate-100 bg-slate-50/30">
                      <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> Financial Overview (Weekly)
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-xs text-slate-500">Net Wages (Weekly)</span>
                          <span className="text-sm font-bold text-slate-900">${laborCosts.subtotalWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-xs text-slate-500">Taxes, Insurance & Benefits</span>
                          <span className="text-sm font-bold text-slate-600">+${laborCosts.taxesWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                          <span className="text-sm font-bold text-indigo-600 font-display">Total Fully Burdened Cost</span>
                          <span className="text-lg font-bold text-indigo-700 font-display">${laborCosts.totalWeek.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-slate-200">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Annual Wages</span>
                              <span className="text-xs font-bold text-slate-600">${(laborCosts.subtotalWeek * 52).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-indigo-600 font-bold">
                              <span className="text-[10px] uppercase tracking-wider">Annual Total Burden</span>
                              <span className="text-sm">${(laborCosts.totalWeek * 52).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shift Tasks Management */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-display font-bold flex items-center gap-2">
                    <Clock size={24} className="text-indigo-600" /> Operational Shift Tasks
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Manage specific duties assigned to each shift</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {(['day', 'evening', 'night'] as const).map((shiftType) => {
                    const shiftTasks = (building.shiftTasks || []).filter(t => t.shift === shiftType);
                    const shiftTotalMinutes = shiftTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
                    
                    const shiftInfo = {
                      day: { name: 'Day Shift', color: 'indigo', icon: <Sun size={18} /> },
                      evening: { name: 'Evening Shift', color: 'indigo', icon: <Moon size={18} /> },
                      night: { name: 'Night Shift', color: 'slate', icon: <Zap size={18} /> }
                    }[shiftType];

                    return (
                      <div key={shiftType} className="flex flex-col h-full">
                        <div className={`p-4 rounded-t-2xl border-x border-t border-${shiftType === 'night' ? 'slate-700' : 'indigo-100'} ${shiftType === 'night' ? 'bg-slate-800 text-white' : 'bg-indigo-50 text-indigo-900'}`}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              {shiftInfo.icon}
                              <span className="font-bold text-sm">{shiftInfo.name}</span>
                            </div>
                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                              {shiftTotalMinutes} mins
                            </span>
                          </div>
                          <p className="text-[10px] opacity-40">Assigned Operational Duties</p>
                        </div>
                        <div className={`flex-1 p-4 border-x border-b border-${shiftType === 'night' ? 'slate-700' : 'indigo-100'} bg-white rounded-b-2xl space-y-4`}>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {shiftTasks.map(task => (
                              <div key={task.id} className="group p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-all">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="text-left">
                                    <p className="text-xs font-semibold text-slate-800 leading-tight mb-1">{task.description}</p>
                                    <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {task.estimatedMinutes}m
                                    </span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => setEditingTask(task)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button 
                                      onClick={() => removeShiftTask(task.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {shiftTasks.length === 0 && (
                              <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                <p className="text-[10px] text-slate-400 font-medium italic">No tasks assigned</p>
                              </div>
                            )}
                          </div>

                          {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && !editingTask && (
                            <button 
                              onClick={() => setNewTaskForm({ description: '', estimatedMinutes: 0, shift: shiftType })}
                              className="w-full py-2 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={12} /> Add Shift Task
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shift Allocation Timelines */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                      <LayoutDashboard size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">Shift Allocation Timelines</h3>
                      <p className="text-xs text-slate-400 font-medium">Sequential visualization of operational duties</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Total Target: 480m (8h)</span>
                  </div>
                </div>

                <div className="glass-card p-8 bg-white space-y-12">
                  <div className="grid lg:grid-cols-1 gap-12">
                    <ShiftTimeline shiftType="day" tasks={(building.shiftTasks || []).filter(t => t.shift === 'day')} />
                    <ShiftTimeline shiftType="evening" tasks={(building.shiftTasks || []).filter(t => t.shift === 'evening')} />
                    <ShiftTimeline shiftType="night" tasks={(building.shiftTasks || []).filter(t => t.shift === 'night')} />
                  </div>
                </div>
              </div>

              {/* Add/Edit Task Modal Modal Overlay */}
              <AnimatePresence>
                {(newTaskForm.shift || editingTask) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20"
                    >
                      <div className="flex justify-between items-start mb-6 text-left">
                        <div>
                          <h3 className="text-xl font-display font-bold text-slate-900">
                            {editingTask ? 'Edit Task' : `Add to ${newTaskForm.shift?.toUpperCase()} SHIFT`}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Define task parameters and estimated duration</p>
                        </div>
                        <button 
                          onClick={() => {
                            setNewTaskForm({ description: '', estimatedMinutes: 0, shift: null });
                            setEditingTask(null);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="space-y-5 text-left">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Description</label>
                          <input 
                            autoFocus
                            type="text"
                            placeholder="e.g., Clean loading dock area"
                            value={editingTask ? editingTask.description : newTaskForm.description}
                            onChange={(e) => editingTask 
                              ? setEditingTask({ ...editingTask, description: e.target.value })
                              : setNewTaskForm({ ...newTaskForm, description: e.target.value })
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Duration (Minutes)</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={editingTask ? editingTask.estimatedMinutes : newTaskForm.estimatedMinutes}
                              onChange={(e) => editingTask
                                ? setEditingTask({ ...editingTask, estimatedMinutes: parseInt(e.target.value) || 0 })
                                : setNewTaskForm({ ...newTaskForm, estimatedMinutes: parseInt(e.target.value) || 0 })
                              }
                              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">MINS</span>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button 
                            onClick={() => {
                              setNewTaskForm({ description: '', estimatedMinutes: 0, shift: null });
                              setEditingTask(null);
                            }}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            disabled={editingTask ? !editingTask.description : !newTaskForm.description}
                            onClick={() => {
                              if (editingTask) {
                                updateShiftTask(editingTask);
                              } else if (newTaskForm.shift) {
                                addShiftTask(newTaskForm.shift);
                              }
                            }}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                          >
                            {editingTask ? 'Apply Changes' : 'Confirm Task'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : activeTab === 'results' ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Summary Cards */}
              <div className="grid md:grid-cols-5 gap-4">
                <div className="glass-card p-5 bg-indigo-50 border-indigo-100 text-indigo-900">
                  <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1">Total FTE Required</p>
                  <h3 className="text-3xl font-display font-bold">{results.fteRequired.toFixed(2)}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-indigo-500 text-[10px]">Daily: {results.dailyCleaningFte.toFixed(2)} FTE</p>
                    <p className="text-indigo-500 text-[10px]">Annual Floor: {results.annualFloorCareFte.toFixed(2)} FTE</p>
                  </div>
                </div>
                <div className="glass-card p-5">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Managers Needed</p>
                  <h3 className="text-3xl font-display font-bold text-slate-900">{results.managersRequired.toFixed(1)}</h3>
                  <p className="text-slate-400 text-[10px] mt-2">Incl. coaching load</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Rooms</p>
                  <h3 className="text-3xl font-display font-bold text-slate-900">{results.totalRooms}</h3>
                  <p className="text-slate-400 text-[10px] mt-2">Extracted inventory</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Sq Footage</p>
                  <h3 className="text-3xl font-display font-bold text-slate-900">{results.totalSquareFootage.toLocaleString()}</h3>
                  <p className="text-slate-400 text-[10px] mt-2">Cleanable area</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Weekly Cleaning Hrs</p>
                  <h3 className="text-3xl font-display font-bold text-slate-900">{results.totalCleaningHoursPerWeek.toFixed(1)}</h3>
                  <p className="text-slate-400 text-[10px] mt-2">Total labor hours</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Floor Breakdown */}
                <section className="glass-card p-8">
                  <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-indigo-600" />
                    Breakdown by Floor
                  </h3>
                  <div className="space-y-4">
                    {(Object.entries(results.breakdownByFloor) as [string, any][]).map(([floor, data]) => (
                      <div key={floor} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900">Floor {floor}</p>
                          <p className="text-xs text-slate-500">{data.squareFootage.toLocaleString()} sq ft</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-indigo-600">{data.fte.toFixed(2)} FTE</p>
                          <div className="w-32 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{ width: `${(data.fte / results.fteRequired) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Type Breakdown */}
                <section className="glass-card p-8">
                  <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-2">
                    <Calculator size={20} className="text-indigo-600" />
                    Breakdown by Room Type
                  </h3>
                  <div className="space-y-4">
                    {(Object.entries(results.breakdownByType) as [string, any][]).map(([type, data]) => (
                      <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900">{type}</p>
                          <p className="text-xs text-slate-500">{data.count} rooms • {data.squareFootage.toLocaleString()} sq ft</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-700">{data.fte.toFixed(2)} FTE</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                            {((data.fte / results.fteRequired) * 100).toFixed(0)}% of total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Outliers Summary */}
                {building.rooms.some(r => r.outliers || (r.productivityPenalty && r.productivityPenalty > 0)) && (
                  <section className="glass-card p-8 bg-amber-50/30 border-amber-100">
                    <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-2 text-amber-900">
                      <AlertCircle size={20} className="text-amber-600" />
                      Detected Outliers & Productivity Impacts
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {building.rooms.filter(r => r.outliers || (r.productivityPenalty && r.productivityPenalty > 0)).map(room => (
                        <div key={room.id} className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-slate-900">{room.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">{room.type}</p>
                            </div>
                            {room.productivityPenalty && (
                              <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
                                +{room.productivityPenalty}% Penalty
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 italic">
                            {room.outliers || "High density furniture/equipment detected via LiDAR."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Shift Breakdown */}
              <section className="glass-card p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold">Shift Allocation Breakdown</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { id: 'day', name: 'Day Shift', time: '7:00 AM - 3:00 PM', data: results.breakdownByShift.day, color: 'bg-amber-50 border-amber-100 text-amber-700', icon: <Sun size={16} /> },
                    { id: 'evening', name: 'Evening Shift', time: '3:00 PM - 11:00 PM', data: results.breakdownByShift.evening, color: 'bg-indigo-50 border-indigo-100 text-indigo-700', icon: <Moon size={16} /> },
                    { id: 'night', name: 'Night Shift', time: '11:00 PM - 7:00 AM', data: results.breakdownByShift.night, color: 'bg-slate-800 border-slate-700 text-slate-100', icon: <Zap size={16} /> }
                  ].map((shift) => (
                    <div key={shift.name} className={`p-6 rounded-2xl border ${shift.color} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {shift.icon}
                          <h4 className="font-bold">{shift.name}</h4>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{shift.time}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Staffing</p>
                          <p className="text-2xl font-display font-bold">{shift.data.fte.toFixed(1)} <span className="text-sm font-sans font-normal opacity-60">FTE</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Management</p>
                          <p className="text-2xl font-display font-bold">{shift.data.managers.toFixed(1)} <span className="text-sm font-sans font-normal opacity-60">MGR</span></p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-current border-opacity-10 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Assigned Tasks</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold opacity-60">
                              {(shift.data.assignedTasks || []).reduce((acc, t) => acc + t.estimatedMinutes, 0)} mins
                            </span>
                            {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                              <button 
                                onClick={() => setNewTaskForm({ ...newTaskForm, shift: shift.id as any })}
                                className="p-1 hover:bg-white/20 rounded transition-all"
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {(shift.data.assignedTasks || [])
                            .map(task => (
                              <div key={task.id} className="flex items-center justify-between bg-white/10 p-2 rounded-lg group">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{task.description}</p>
                                  <p className="text-[10px] opacity-60">{task.estimatedMinutes} mins</p>
                                </div>
                                {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                                  <button 
                                    onClick={() => removeShiftTask(task.id)}
                                    className="p-1 text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          
                          {newTaskForm.shift === shift.id && (
                            <div className="p-3 bg-white/20 rounded-xl space-y-2">
                              <input 
                                type="text"
                                placeholder="Task description..."
                                value={newTaskForm.description}
                                onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                                className="w-full bg-white/20 border-none rounded-lg px-2 py-1 text-xs placeholder:text-white/40 outline-none"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number"
                                  placeholder="Mins"
                                  value={newTaskForm.estimatedMinutes || ''}
                                  onChange={(e) => setNewTaskForm({ ...newTaskForm, estimatedMinutes: parseInt(e.target.value) || 0 })}
                                  className="w-20 bg-white/20 border-none rounded-lg px-2 py-1 text-xs placeholder:text-white/40 outline-none"
                                />
                                <button 
                                  onClick={() => addShiftTask(shift.id as any)}
                                  className="flex-1 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-bold"
                                >
                                  Add
                                </button>
                                <button 
                                  onClick={() => setNewTaskForm({ ...newTaskForm, shift: null })}
                                  className="p-1 text-white/60"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {(shift.data.assignedTasks || []).length === 0 && !newTaskForm.shift && (
                            <p className="text-[10px] italic opacity-50">No tasks assigned</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-current border-opacity-10">
                        <p className="text-[10px] italic opacity-70">
                          {shift.id === 'day' && "Focus: Policing, high-traffic areas, and exam room maintenance."}
                          {shift.id === 'evening' && "Focus: Full cleaning of offices, exam rooms, and common areas."}
                          {shift.id === 'night' && "Focus: Terminal cleaning of surgical spaces and deep floor care."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Flooring Breakdown */}
              <section className="glass-card p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold">Flooring & Specialized Care Breakdown</h2>
                </div>
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Floor Care Intensity</h3>
                    {(Object.entries(results.breakdownByFlooring) as [string, FlooringBreakdown][]).map(([flooring, data]) => (
                      <div key={flooring} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{flooring}</p>
                          <p className="text-xs text-slate-500">{data.squareFootage.toLocaleString()} sq ft total</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{data.annualFloorCareHours.toFixed(1)} Annual Hours</p>
                          <p className="text-[10px] text-slate-400 font-medium">Projected Floor Care Need</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100">
                    <h3 className="text-lg font-display font-bold text-emerald-900 mb-4">Floor Care Insights</h3>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                          <Info size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-900">Annual Project Work</p>
                          <p className="text-sm text-emerald-700 leading-relaxed">
                            Based on your flooring profile, you require <strong>{(Object.values(results.breakdownByFlooring) as FlooringBreakdown[]).reduce((acc, curr) => acc + curr.annualFloorCareHours, 0).toFixed(0)} hours</strong> of specialized floor care annually. This includes stripping, waxing, and deep extraction.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-900">Equipment Recommendation</p>
                          <p className="text-sm text-emerald-700 leading-relaxed">
                            {results.breakdownByFlooring[FlooringType.CARPET]?.squareFootage > 5000 && "High carpet volume suggests a need for dedicated ride-on extractors. "}
                            {results.breakdownByFlooring[FlooringType.VCT]?.squareFootage > 10000 && "Significant VCT area requires a robust strip/wax schedule and high-speed burnishers. "}
                            {results.breakdownByFlooring[FlooringType.LVT]?.squareFootage > 0 && "LVT areas should be maintained with neutral cleaners to preserve warranty. "}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Management Insights */}
              <section className="glass-card p-8 bg-slate-50 text-slate-900 border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <AlertCircle size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold">Management & Training Requirements</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Oversight Ratio</p>
                    <p className="text-sm">1 Manager per 12 FTEs is the industry standard for high-performance teams. Current requirement: <span className="text-indigo-600 font-bold">{results.managersRequired.toFixed(1)} Managers</span>.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Weekly Training</p>
                    <p className="text-sm">Estimated <span className="text-indigo-600 font-bold">{results.oversightHoursPerWeek.toFixed(1)} hours</span> of coaching and safety training required per week.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Managerial Load</p>
                    <p className="text-sm text-slate-700">{results.managerialLoadDescription}</p>
                  </div>
                </div>
              </section>

              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setActiveTab('setup')}
                  className="btn-secondary"
                >
                  Back to Setup
                </button>
                <button 
                  onClick={() => exportToExcel(building, results)}
                  className="btn-primary flex items-center gap-2"
                >
                  Export Report
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'floorcare' ? (
            <motion.div 
              key="floorcare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Zap size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold">Floor Care & Equipment Assignment</h2>
                </div>
                <div className="flex gap-4">
                  <div className="glass-card px-4 py-2 bg-emerald-50 border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Annual Floor FTE</p>
                    <p className="text-lg font-display font-bold text-emerald-900">{results.annualFloorCareFte.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Flooring</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sq Ft</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Equipment</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Productivity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {building.rooms.map(room => {
                        const bestProductivity = room.assignedEquipment && room.assignedEquipment.length > 0
                          ? Math.min(...room.assignedEquipment.map(eq => EQUIPMENT_PRODUCTIVITY[eq] || 1.0))
                          : 1.0;
                        
                        return (
                          <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-4 font-medium text-slate-900">{room.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{room.type}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">{room.flooringType}</td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-600">{room.squareFootage.toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {Object.values(EquipmentType).map(eq => (
                                  <button
                                    key={eq}
                                    onClick={() => {
                                      const current = room.assignedEquipment || [];
                                      const next = current.includes(eq)
                                        ? current.filter(e => e !== eq)
                                        : [...current, eq];
                                      updateRoom(room.id, { assignedEquipment: next });
                                    }}
                                    className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all border ${
                                      (room.assignedEquipment || []).includes(eq)
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                    {eq}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${bestProductivity < 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {(100 / bestProductivity).toFixed(0)}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${bestProductivity < 0.5 ? 'bg-emerald-500' : bestProductivity < 1 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                    style={{ width: `${(1 / bestProductivity) * 25}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'services' ? (
            <motion.div 
              key="services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold">Cleaning Service Frequencies</h2>
                </div>
                <div className="flex gap-4">
                  <div className="glass-card px-4 py-2 bg-indigo-50 border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Daily Cleaning FTE</p>
                    <p className="text-lg font-display font-bold text-indigo-900">{results.dailyCleaningFte.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        {Object.values(ServiceType).map(service => (
                          <th key={service} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                            {service}
                            <span className="block text-[8px] opacity-60 normal-case">Times/Week</span>
                          </th>
                        ))}
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Outliers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {building.rooms.map(room => (
                        <React.Fragment key={room.id}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-medium text-slate-900">{room.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{room.type}</td>
                          {Object.values(ServiceType).map(service => (
                            <td key={service} className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => {
                                    const current = room.serviceFrequencies?.[service] || 0;
                                    const next = Math.max(0, current - 1);
                                    updateRoom(room.id, { 
                                      serviceFrequencies: { 
                                        ...(room.serviceFrequencies || DEFAULT_SERVICES[room.type] || {}), 
                                        [service]: next 
                                      } as Record<ServiceType, number>
                                    });
                                  }}
                                  className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-mono font-bold text-slate-700">
                                  {room.serviceFrequencies?.[service] || 0}
                                </span>
                                <button 
                                  onClick={() => {
                                    const current = room.serviceFrequencies?.[service] || 0;
                                    const next = current + 1;
                                    updateRoom(room.id, { 
                                      serviceFrequencies: { 
                                        ...(room.serviceFrequencies || DEFAULT_SERVICES[room.type] || {}), 
                                        [service]: next 
                                      } as Record<ServiceType, number>
                                    });
                                  }}
                                  className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          ))}
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => setExpandedOutliers(prev => ({ ...prev, [room.id]: !prev[room.id] }))}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                (room.serviceOutliers?.length || 0) > 0 
                                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {room.serviceOutliers?.length || 0} Outliers
                            </button>
                          </td>
                        </tr>
                        {expandedOutliers[room.id] && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={Object.values(ServiceType).length + 3} className="px-8 py-6">
                              <div className="space-y-4 max-w-4xl">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Sparkles size={14} className="text-indigo-500" />
                                    <h4 className="text-sm font-bold text-slate-700">Special Service Outliers for {room.name}</h4>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newOutlier = { 
                                        id: Math.random().toString(36).substr(2, 9), 
                                        description: 'New Outlier', 
                                        additionalMinutes: 15, 
                                        frequencyPerWeek: 1 
                                      };
                                      updateRoom(room.id, { serviceOutliers: [...(room.serviceOutliers || []), newOutlier] });
                                    }}
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                  >
                                    <Plus size={14} /> Add Outlier
                                  </button>
                                </div>
                                <div className="grid gap-3">
                                  {room.serviceOutliers?.map(outlier => (
                                    <div key={outlier.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex-1">
                                        <input 
                                          type="text" 
                                          value={outlier.description}
                                          onChange={e => {
                                            const newOutliers = room.serviceOutliers?.map(o => o.id === outlier.id ? { ...o, description: e.target.value } : o);
                                            updateRoom(room.id, { serviceOutliers: newOutliers });
                                          }}
                                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-700 font-medium"
                                          placeholder="e.g. Ceiling to floor windows"
                                        />
                                      </div>
                                      <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                                        <div className="flex flex-col">
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Additional Mins</span>
                                          <input 
                                            type="number" 
                                            value={outlier.additionalMinutes}
                                            onChange={e => {
                                              const newOutliers = room.serviceOutliers?.map(o => o.id === outlier.id ? { ...o, additionalMinutes: Number(e.target.value) } : o);
                                              updateRoom(room.id, { serviceOutliers: newOutliers });
                                            }}
                                            className="w-16 bg-slate-50 border-none rounded p-1 text-xs font-mono text-center focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Freq/Wk</span>
                                          <input 
                                            type="number" 
                                            value={outlier.frequencyPerWeek}
                                            onChange={e => {
                                              const newOutliers = room.serviceOutliers?.map(o => o.id === outlier.id ? { ...o, frequencyPerWeek: Number(e.target.value) } : o);
                                              updateRoom(room.id, { serviceOutliers: newOutliers });
                                            }}
                                            className="w-12 bg-slate-50 border-none rounded p-1 text-xs font-mono text-center focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                        <button 
                                          onClick={() => {
                                            const newOutliers = room.serviceOutliers?.filter(o => o.id !== outlier.id);
                                            updateRoom(room.id, { serviceOutliers: newOutliers });
                                          }}
                                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {(!room.serviceOutliers || room.serviceOutliers.length === 0) && (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                      <p className="text-xs text-slate-400 italic">No special outliers added for this room yet.</p>
                                      <button 
                                        onClick={() => {
                                          const newOutlier = { 
                                            id: Math.random().toString(36).substr(2, 9), 
                                            description: 'Ceiling to floor windows', 
                                            additionalMinutes: 30, 
                                            frequencyPerWeek: 1 
                                          };
                                          updateRoom(room.id, { serviceOutliers: [newOutlier] });
                                        }}
                                        className="mt-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest"
                                      >
                                        + Add First Outlier
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'lidar' ? (
            <motion.div 
              key="lidar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">LiDAR Scan History</h2>
                  <p className="text-slate-500">View and manage all laser-scanned room data.</p>
                </div>
                <div className="flex items-center gap-3">
                  {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                    <button 
                      onClick={saveLidarScansManually}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm
                        ${lidarSaveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                      {lidarSaveStatus === 'saving' ? <Loader2 className="animate-spin" size={18} /> : 
                       lidarSaveStatus === 'saved' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                      {lidarSaveStatus === 'saving' ? 'Saving...' : lidarSaveStatus === 'saved' ? 'Saved' : 'Save All Scans'}
                    </button>
                  )}
                  {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                    <button 
                      onClick={() => setIsLidarOpen(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Scan size={18} /> New Scan
                    </button>
                  )}
                </div>
              </div>

              {/* Selection Bar */}
              {selectedScanIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">
                      {selectedScanIds.length}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold">Scans Selected</p>
                      {selectedScanIds.length === 1 && (
                        <p className="text-[10px] text-slate-400 font-medium">Select 1 more to compare</p>
                      )}
                      {selectedScanIds.length === 2 && (
                        <p className="text-[10px] text-indigo-400 font-bold">Ready to compare</p>
                      )}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-700" />
                  <div className="flex gap-3">
                    <button 
                      disabled={selectedScanIds.length !== 2}
                      onClick={() => setIsComparing(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20
                        ${selectedScanIds.length === 2 
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse-slow' 
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                    >
                      <ArrowLeftRight size={14} /> Compare Side-by-Side
                    </button>
                    <button 
                      disabled={isBatchAnalyzing}
                      onClick={() => setIsBatchConfirmOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                      {isBatchAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                      AI Analysis
                    </button>
                    {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                      <button 
                        disabled={isBatchAnalyzing}
                        onClick={() => setIsBatchConfirmOpen(true)}
                        className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                      >
                        {isBatchAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                        Re-analyze
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        const selectedScans = lidarScans.filter(s => selectedScanIds.includes(s.id));
                        setViewing3DScans(selectedScans);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Box size={14} /> 3D View
                    </button>
                    <button 
                      onClick={() => batchExport()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Download size={14} /> Export CSV
                    </button>
                    <button 
                      onClick={() => setSelectedScanIds([])}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </motion.div>
              )}

              {/* LiDAR Search and Filters */}
              <div className="px-8 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Search scans by room name, ID, or objects..."
                    value={lidarSearchQuery}
                    onChange={(e) => setLidarSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filters:</span>
                  </div>
                  
                  <select 
                    value={lidarFilterType}
                    onChange={(e) => setLidarFilterType(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    {Object.values(RoomType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <select 
                    value={lidarFilterDate}
                    onChange={(e) => setLidarFilterDate(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="All">Any Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  {lidarFilterDate === 'custom' && (
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                      <input 
                        type="date"
                        value={lidarFilterStartDate}
                        onChange={(e) => setLidarFilterStartDate(e.target.value)}
                        className="text-xs font-medium text-slate-600 outline-none bg-transparent"
                      />
                      <span className="text-slate-400 text-[10px] font-bold">TO</span>
                      <input 
                        type="date"
                        value={lidarFilterEndDate}
                        onChange={(e) => setLidarFilterEndDate(e.target.value)}
                        className="text-xs font-medium text-slate-600 outline-none bg-transparent"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      placeholder="Filter by object..."
                      value={lidarFilterObject}
                      onChange={(e) => setLidarFilterObject(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none w-40"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Min Confidence:</span>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={lidarFilterConfidence}
                      onChange={(e) => setLidarFilterConfidence(Number(e.target.value))}
                      className="w-24 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-[10px] font-mono font-bold text-indigo-600 w-8">{lidarFilterConfidence}%</span>
                  </div>
                  
                  {(lidarSearchQuery || lidarFilterType !== 'All' || lidarFilterDate !== 'All' || lidarFilterConfidence > 0 || lidarFilterObject || lidarFilterStartDate || lidarFilterEndDate) && (
                    <button 
                      onClick={() => {
                        setLidarSearchQuery('');
                        setLidarFilterType('All');
                        setLidarFilterDate('All');
                        setLidarFilterStartDate('');
                        setLidarFilterEndDate('');
                        setLidarFilterObject('');
                        setLidarFilterConfidence(0);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {lidarScans.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Scan size={32} />
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold">No scans found</p>
                    <p className="text-slate-500 text-sm">Connect your MS200 or upload a SLAM map to begin.</p>
                  </div>
                </div>
              ) : filteredLidarScans.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Search size={32} />
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold">No matching scans</p>
                    <p className="text-slate-500 text-sm">Adjust your filters or search query to find what you're looking for.</p>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLidarScans.map(scan => (
                    <motion.div 
                      key={scan.id}
                      layoutId={scan.id}
                      className="glass-card overflow-hidden group"
                    >
                      <div className="aspect-video bg-slate-900 relative overflow-hidden">
                        {/* Selection Checkbox */}
                        <div className="absolute top-4 left-4 z-20">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScanIds(prev => 
                                prev.includes(scan.id) 
                                  ? prev.filter(id => id !== scan.id)
                                  : [...prev, scan.id]
                              );
                            }}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                              ${selectedScanIds.includes(scan.id) 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-black/20 border-white/40 text-transparent hover:border-white'}`}
                          >
                            <Check size={14} />
                          </button>
                        </div>

                        <img 
                          src={scan.imageUrl} 
                          alt={scan.roomName}
                          className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Highlights Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          {scan.highlights?.map((h, i) => (
                            <button 
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewing3DScans([scan]);
                                setHighlightedObjectLabel(h.label);
                              }}
                              className={`absolute border-2 rounded-sm pointer-events-auto group/highlight transition-all
                                ${highlightedObjectLabel === h.label && viewing3DScans?.[0]?.id === scan.id
                                  ? 'border-indigo-500 bg-indigo-500/20 z-30 scale-110 shadow-lg shadow-indigo-500/40' 
                                  : 'border-amber-400/60 bg-amber-400/10 hover:border-amber-400 hover:bg-amber-400/20 z-10'}`}
                              style={{
                                left: `${h.x}%`,
                                top: `${h.y}%`,
                                width: `${h.width}%`,
                                height: `${h.height}%`
                              }}
                            >
                              <div className={`absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded transition-opacity whitespace-nowrap z-20 shadow-lg
                                ${highlightedObjectLabel === h.label && viewing3DScans?.[0]?.id === scan.id ? 'opacity-100' : 'opacity-0 group-hover/highlight:opacity-100'}`}>
                                {h.label}
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <div className="text-white">
                            <div className="flex flex-col">
                              <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest leading-tight">Scan ID: {scan.id}</p>
                              <p className="text-[9px] text-white/60 font-medium mt-0.5 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(scan.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                            <p className="font-bold mt-1">{scan.roomName}</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/20">
                            {scan.confidence * 100}% CONFIDENCE
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        {editingScanId === scan.id ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Room Name</label>
                              <input 
                                type="text"
                                value={editForm.roomName || ''}
                                onChange={(e) => updateEditForm({ roomName: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                                <select 
                                  value={editForm.roomType}
                                  onChange={(e) => updateEditForm({ roomType: e.target.value as RoomType })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                  {Object.values(RoomType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Area (SqFt)</label>
                                <input 
                                  type="number"
                                  value={editForm.squareFootage || 0}
                                  onChange={(e) => updateEditForm({ squareFootage: Number(e.target.value) })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Volume (CuFt)</label>
                                <input 
                                  type="number"
                                  value={editForm.volume || 0}
                                  onChange={(e) => updateEditForm({ volume: Number(e.target.value) })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Detected Objects (Comma Separated)</label>
                              <textarea 
                                value={editForm.detectedObjects?.join(', ') || ''}
                                onChange={(e) => updateEditForm({ detectedObjects: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none"
                                placeholder="e.g. Desk, Chair, Cabinet"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Scan Notes</label>
                              <textarea 
                                value={editForm.notes || ''}
                                onChange={(e) => updateEditForm({ notes: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none"
                                placeholder="Add observations or specific instructions..."
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button 
                                onClick={() => saveScanEdit(scan.id)}
                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                              >
                                <Check size={14} /> Save Changes
                              </button>
                              <button 
                                onClick={cancelScanEdit}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="p-2 bg-slate-50 rounded-xl">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Type</p>
                                <p className="text-[10px] font-bold text-slate-900 truncate">{scan.roomType}</p>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-xl">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Area</p>
                                <p className="text-[10px] font-bold text-slate-900">{scan.squareFootage} ft²</p>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-xl">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Volume</p>
                                <p className="text-[10px] font-bold text-slate-900">{scan.volume || 0} ft³</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Detected Outliers (Productivity Impacts)</p>
                              <div className="flex flex-wrap gap-2">
                                {scan.detectedObjects.map((obj, i) => (
                                  <button 
                                    key={i} 
                                    onClick={() => {
                                      setViewing3DScans([scan]);
                                      setHighlightedObjectLabel(obj);
                                    }}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all
                                      ${highlightedObjectLabel === obj && viewing3DScans?.[0]?.id === scan.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                        : 'bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300 hover:bg-amber-100'}`}
                                  >
                                    {obj}
                                  </button>
                                ))}
                                {scan.detectedObjects.length === 0 && (
                                  <span className="text-xs text-slate-400 italic">No significant outliers detected</span>
                                )}
                              </div>
                            </div>

                            {scan.productivityPenalty !== undefined && scan.productivityPenalty > 0 && (
                              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] font-bold text-rose-600 uppercase">Est. Productivity Penalty</p>
                                  <span className="text-xs font-mono font-bold text-rose-700">+{scan.productivityPenalty}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-rose-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-rose-500 transition-all duration-1000" 
                                    style={{ width: `${Math.min(scan.productivityPenalty, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {scan.aiReasoning && (
                              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                <p className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1.5 mb-1">
                                  <Sparkles size={10} /> AI Identification Logic
                                </p>
                                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                  "{scan.aiReasoning}"
                                </p>
                              </div>
                            )}

                            {scan.notes && (
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 italic">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                  <FileText size={10} /> Inspector Notes
                                </p>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  "{scan.notes}"
                                </p>
                              </div>
                            )}

                            <button 
                              onClick={() => setViewing3DScans([scan])}
                              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Box size={14} /> Inspect in 3D Space
                            </button>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {new Date(scan.timestamp).toLocaleString()}
                                </span>
                                {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                                  <button 
                                    onClick={() => startEditingScan(scan)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-slate-100"
                                    title="Edit Scan Data"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => batchExport([scan])}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                                  title="Export to CSV"
                                >
                                  <Download size={14} />
                                </button>
                                <button 
                                  onClick={() => setQrCodeScanId(scan.id)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-slate-100"
                                  title="Generate QR Code"
                                >
                                  <QrCode size={14} />
                                </button>
                              </div>
                              {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                                <button 
                                  onClick={() => {
                                    setLidarScans(prev => prev.filter(s => s.id !== scan.id));
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'standards' ? (
            <motion.div 
              key="standards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Info size={20} />
                </div>
                <h2 className="text-xl font-display font-bold">Calculation Standards & Logic</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cleaning Rates */}
                <div className="glass-card p-8 space-y-6">
                  <h3 className="text-lg font-display font-bold text-slate-900 border-b border-slate-100 pb-4">Cleaning Standards (ISSA)</h3>
                  <p className="text-sm text-slate-500">Base production rates in minutes per 1,000 square feet. These represent "Level 2" cleaning standards.</p>
                  <div className="space-y-3">
                    {Object.entries(CLEANING_RATES).map(([type, rate]) => (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{type}</span>
                        <span className="font-mono font-bold text-slate-900">{rate} min / 1k sqft</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Multipliers */}
                <div className="glass-card p-8 space-y-6">
                  <h3 className="text-lg font-display font-bold text-slate-900 border-b border-slate-100 pb-4">Service Type Multipliers</h3>
                  <p className="text-sm text-slate-500">How different service types affect the base cleaning time.</p>
                  <div className="space-y-4">
                    {Object.entries(SERVICE_MULTIPLIERS).map(([service, multiplier]) => (
                      <div key={service} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{service}</p>
                          <p className="text-xs text-slate-500">
                            {service === ServiceType.REGULAR ? 'Baseline standard' : 
                             service === ServiceType.TERMINAL ? 'Deep disinfection & turnover' :
                             service === ServiceType.CYCLE ? 'Periodic deep cleaning' : 'Maintenance & policing'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-display font-bold text-indigo-600">x{multiplier}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipment Productivity */}
                <div className="glass-card p-8 space-y-6">
                  <h3 className="text-lg font-display font-bold text-slate-900 border-b border-slate-100 pb-4">Equipment Productivity</h3>
                  <p className="text-sm text-slate-500">Multipliers applied to base rates when specific equipment is assigned.</p>
                  <div className="space-y-3">
                    {Object.entries(EQUIPMENT_PRODUCTIVITY).map(([eq, prod]) => (
                      <div key={eq} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{eq}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">({(1/prod).toFixed(1)}x faster)</span>
                          <span className="font-mono font-bold text-emerald-600">{prod}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floor Care Rates */}
                <div className="glass-card p-8 space-y-6">
                  <h3 className="text-lg font-display font-bold text-slate-900 border-b border-slate-100 pb-4">Annual Floor Care</h3>
                  <p className="text-sm text-slate-500">Estimated annual hours per 1,000 square feet for specialized floor maintenance.</p>
                  <div className="space-y-3">
                    {Object.entries(ANNUAL_FLOOR_CARE_RATES).map(([floor, rate]) => (
                      <div key={floor} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{floor}</span>
                        <span className="font-mono font-bold text-slate-900">{rate} hrs / yr</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FTE Formula */}
              <div className="glass-card p-8 bg-slate-50 border-slate-200">
                <h3 className="text-lg font-display font-bold mb-6 text-slate-900">Staffing Calculation Formula</h3>
                <div className="space-y-6 font-mono text-sm">
                  <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-indigo-700 font-bold mb-2">// Weekly Cleaning Hours</p>
                    <p className="text-black font-bold">Hours = [ (SqFt / 1000) * (BaseRate * EquipmentMult * ServiceMult / 60) * Frequency ] + OutlierHours</p>
                    <p className="text-[10px] text-slate-500 mt-2 italic">OutlierHours = (AdditionalMinutes / 60) * OutlierFrequency</p>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-indigo-700 font-bold mb-2">// Total FTE Required</p>
                    <p className="text-black font-bold">FTE = (TotalWeeklyHours + (AnnualFloorCareHours / 52)) / {HOURS_PER_FTE_WEEK}</p>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-indigo-700 font-bold mb-2">// Management Requirements</p>
                    <p className="text-black font-bold">Managers = FTE / {FTE_PER_MANAGER}</p>
                    <p className="text-black font-bold">Oversight = FTE * {OVERSIGHT_HOURS_PER_EMPLOYEE} hrs/wk</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'resources' ? (
            <motion.div 
              key="resources"
              ref={proposalRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12 max-w-5xl mx-auto print:p-0"
            >
              {/* Header with Download */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Product Resources & ROI</h2>
                  </div>
                  <p className="text-slate-500">Comprehensive documentation and value proposition for stakeholders.</p>
                </div>
                <button 
                  onClick={downloadProposal}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Download size={18} /> Download Proposal
                    </>
                  )}
                </button>
              </div>

              {/* White Paper Section */}
              <div className="glass-card p-8 md:p-12 space-y-8 print:shadow-none print:border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg print:hidden">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-slate-900">White Paper: The Science of Cleaning Staffing</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-4 text-slate-600 leading-relaxed">
                    <h4 className="font-bold text-slate-900">Methodology Overview</h4>
                    <p>
                      Our staffing model is built upon the International Sanitary Supply Association (ISSA) 612 Cleaning Times & Tasks. 
                      By digitizing these standards, we eliminate the guesswork in environmental services management.
                    </p>
                    <p>
                      The core of our logic utilizes "Level 2" cleaning standards, which represent a high-quality, professional appearance 
                      suitable for healthcare and corporate environments.
                    </p>
                  </div>
                  <div className="space-y-4 text-slate-600 leading-relaxed">
                    <h4 className="font-bold text-slate-900">Data-Driven Precision</h4>
                    <p>
                      Traditional staffing often relies on "square feet per hour" averages. Our system breaks down labor requirements by:
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>Room-specific task intensity (ISSA)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>Equipment productivity multipliers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>Service type frequency (Regular vs. Terminal)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ROI & Benefits Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* ROI Section */}
                <div className="glass-card p-8 space-y-6 border-l-4 border-l-emerald-500 print:shadow-none print:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg print:hidden">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="text-lg font-display font-bold text-slate-900">Return on Investment</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/50 rounded-xl print:bg-slate-50">
                      <p className="text-sm font-bold text-emerald-800">Labor Optimization</p>
                      <p className="text-xs text-emerald-600 mt-1">Reduce over-staffing by 15-20% through precise task allocation.</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-xl print:bg-slate-50">
                      <p className="text-sm font-bold text-emerald-800">Equipment ROI</p>
                      <p className="text-xs text-emerald-600 mt-1">Justify capital expenditure for autonomous scrubbers by demonstrating FTE reduction.</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-xl print:bg-slate-50">
                      <p className="text-sm font-bold text-emerald-800">Compliance Savings</p>
                      <p className="text-xs text-emerald-600 mt-1">Avoid regulatory fines with documented, standard-based cleaning protocols.</p>
                    </div>
                  </div>
                </div>

                {/* Benefits Section */}
                <div className="glass-card p-8 space-y-6 border-l-4 border-l-indigo-500 print:shadow-none print:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:hidden">
                      <Award size={20} />
                    </div>
                    <h3 className="text-lg font-display font-bold text-slate-900">Key Benefits</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-1 bg-indigo-50 text-indigo-600 rounded print:hidden">
                        <CheckCircle2 size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Defensible Staffing</p>
                        <p className="text-xs text-slate-500">Back your budget requests with industry-standard ISSA data.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-1 bg-indigo-50 text-indigo-600 rounded print:hidden">
                        <CheckCircle2 size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Visual Inventory</p>
                        <p className="text-xs text-slate-500">Interactive floor maps provide instant spatial context for labor.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-1 bg-indigo-50 text-indigo-600 rounded print:hidden">
                        <CheckCircle2 size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Dynamic Scenarios</p>
                        <p className="text-xs text-slate-500">Instantly model the impact of frequency changes or new equipment.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LiDAR Integration Guide */}
              <div className="glass-card p-8 md:p-12 space-y-8 border-l-4 border-l-indigo-600 print:shadow-none print:border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg print:hidden">
                    <Scan size={20} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-slate-900">LiDAR Integration Guide: Yahboom MS200</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Usb size={16} className="text-indigo-600" /> 1. Physical Connection
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Connect the Yahboom MS200 to your workstation via the provided USB-to-Serial cable. 
                      The device operates on a standard 5V power supply through the USB interface.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Activity size={16} className="text-indigo-600" /> 2. Web Serial Sync
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Navigate to the "Building Setup" tab and select "LiDAR Scan". 
                      Grant the browser permission to access the Serial Port to begin receiving real-time 360° point cloud data.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Maximize2 size={16} className="text-indigo-600" /> 3. Mapping & Analysis
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      As you scan, the system builds a SLAM occupancy grid. 
                      Our AI automatically calculates room dimensions and identifies physical outliers for precise labor estimation.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-700 font-medium flex items-center gap-2">
                    <Zap size={14} /> 
                    Pro Tip: For best results, maintain a steady walking pace and ensure the scanner has a clear line of sight to all corners of the room.
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="glass-card p-8 bg-slate-900 text-white text-center space-y-4 print:bg-white print:text-slate-900 print:border-slate-200">
                <h3 className="text-xl font-display font-bold">Ready to optimize your facility?</h3>
                <p className="text-slate-400 max-w-lg mx-auto text-sm print:text-slate-600">
                  This report was generated using the Medama iTrak Staffing Analysis platform. 
                  Contact our team for a full implementation strategy.
                </p>
                <div className="pt-4 print:hidden">
                  <button 
                    onClick={() => setActiveTab('results')}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                  >
                    View Current Analysis
                  </button>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'visual' ? (
            <motion.div 
              key="visual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <BuildingMap rooms={building.rooms} />
            </motion.div>
          ) : (
            <motion.div 
              key="saved"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <History size={20} />
                  </div>
                  <h2 className="text-xl font-display font-bold">Saved Buildings</h2>
                </div>
                {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                  <button onClick={createNewBuilding} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> New Building
                  </button>
                )}
              </div>

              {accessibleBuildings.length === 0 ? (
                <div className="glass-card p-16 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <Building2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">No buildings found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-1">
                      {currentUser?.role === UserRole.VIEWER 
                        ? "You don't have access to any buildings yet. Contact an administrator."
                        : "Your building data will appear here once you save your first project."}
                    </p>
                  </div>
                  {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                    <button onClick={() => setActiveTab('setup')} className="btn-secondary">
                      Go to Setup
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accessibleBuildings.map(b => (
                    <motion.div 
                      key={b.id}
                      whileHover={{ y: -4 }}
                      onClick={() => loadBuilding(b)}
                      className="glass-card p-6 cursor-pointer group hover:border-indigo-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Building2 size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportBuildingComprehensiveData(b);
                            }}
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Download Comprehensive Report"
                          >
                            <Download size={18} />
                          </button>
                          {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.EDITOR) && (
                            <button 
                              onClick={(e) => deleteSavedBuilding(b.id, e)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Building"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{b.name || 'Untitled Building'}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                        <MapPin size={14} /> {b.location || 'No location set'}
                      </p>
                      
                      <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rooms</p>
                            <p className="font-bold text-slate-700">{b.rooms.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sq Ft</p>
                            <p className="font-bold text-slate-700">{b.rooms.reduce((acc, r) => acc + r.squareFootage, 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Edited</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                            <Clock size={12} /> {new Date(b.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Admin Control Panel</h2>
                  <p className="text-slate-500">Manage system access and global configurations.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <div className="glass-card p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">Access Security</h3>
                        <p className="text-xs text-slate-500">Update the master system passcode</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Master Passcode</label>
                        <input 
                          type="text"
                          value={appPasscode}
                          onChange={(e) => {
                            setAppPasscode(e.target.value);
                          }}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 italic">This is the fallback passcode for all Admin access.</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                        <Settings size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">System Logs</h3>
                        <p className="text-xs text-slate-500">Audit trail (Coming Soon)</p>
                      </div>
                    </div>
                    <div className="h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                      <p className="text-xs text-slate-400 font-medium italic">Log data will appear here</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div className="glass-card p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">User Profiles</h3>
                          <p className="text-xs text-slate-500">Manage view-only and admin accounts</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Create User Form */}
                      <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Create New Profile</h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                            <input 
                              type="text"
                              placeholder="e.g. John Smith"
                              value={newUserForm.name}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Passcode</label>
                            <input 
                              type="text"
                              placeholder="4-digit code"
                              value={newUserForm.passcode}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, passcode: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                            <select 
                              value={newUserForm.role}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value={UserRole.VIEWER}>View-Only</option>
                              <option value={UserRole.EDITOR}>Operator</option>
                              <option value={UserRole.ADMIN}>Administrator</option>
                            </select>
                          </div>
                          
                          {newUserForm.role !== UserRole.ADMIN && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Building Access</label>
                              <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-white border border-slate-200 rounded-lg">
                                {savedBuildings.map(b => (
                                  <label key={b.id} className="flex items-center gap-2 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      checked={newUserForm.accessibleBuildingIds?.includes(b.id)}
                                      onChange={(e) => {
                                        const ids = newUserForm.accessibleBuildingIds || [];
                                        if (e.target.checked) {
                                          setNewUserForm(prev => ({ ...prev, accessibleBuildingIds: [...ids, b.id] }));
                                        } else {
                                          setNewUserForm(prev => ({ ...prev, accessibleBuildingIds: ids.filter(id => id !== b.id) }));
                                        }
                                      }}
                                      className="rounded text-indigo-600"
                                    />
                                    <span className="truncate">{b.name || 'Untitled Building'}</span>
                                  </label>
                                ))}
                                {savedBuildings.length === 0 && <p className="text-[10px] text-slate-400 italic">No buildings saved yet</p>}
                              </div>
                              <p className="text-[10px] text-slate-400 italic">
                                {newUserForm.role === UserRole.EDITOR 
                                  ? "Operators can manage only the buildings they are assigned to."
                                  : "Viewers can only see results for assigned buildings."}
                              </p>
                            </div>
                          )}

                          <button 
                            onClick={() => {
                              if (!newUserForm.name || !newUserForm.passcode) return;
                              const profile: UserProfile = {
                                id: Math.random().toString(36).substr(2, 9),
                                name: newUserForm.name,
                                passcode: newUserForm.passcode,
                                role: newUserForm.role || UserRole.VIEWER,
                                accessibleBuildingIds: newUserForm.accessibleBuildingIds || [],
                                createdAt: Date.now()
                              };
                              const updated = [...userProfiles, profile];
                              setUserProfiles(updated);
                              setNewUserForm({ name: '', passcode: '', role: UserRole.VIEWER, accessibleBuildingIds: [] });
                            }}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={14} /> Create Profile
                          </button>
                        </div>
                      </div>

                      {/* User List */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Existing Profiles</h4>
                        <div className="space-y-2">
                          {userProfiles.map(profile => (
                            <div key={profile.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center 
                                  ${profile.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-600' : 
                                    profile.role === UserRole.EDITOR ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {profile.role === UserRole.ADMIN ? <ShieldCheck size={16} /> : 
                                   profile.role === UserRole.EDITOR ? <Zap size={16} /> : <ImageIcon size={16} />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{profile.name}</p>
                                  <p className="text-[10px] text-slate-500">{profile.role} • Passcode: {profile.passcode}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const updated = userProfiles.filter(p => p.id !== profile.id);
                                  setUserProfiles(updated);
                                }}
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {userProfiles.length === 0 && (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              <p className="text-xs text-slate-400 font-medium italic">No custom profiles created</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => {
                    setIsLoggedIn(false);
                    sessionStorage.removeItem('medama_itrak_auth');
                    setActiveTab('setup');
                  }}
                  className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2"
                >
                  Log Out <ExternalLink size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Batch Re-analysis Confirmation Modal */}
        <AnimatePresence>
          {isBatchConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <RefreshCw size={20} />
                    </div>
                    <h2 className="text-lg font-display font-bold text-slate-900">Confirm AI Analysis</h2>
                  </div>
                  <button onClick={() => setIsBatchConfirmOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
                    <Sparkles className="text-indigo-600 shrink-0" size={20} />
                    <p className="text-sm text-indigo-800 leading-relaxed">
                      You are about to analyze <strong>{selectedScanIds.length}</strong> scans. The AI will identify objects, estimate volume, and calculate productivity impacts.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Select AI Model Version</label>
                    <div className="space-y-2">
                      {[
                        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', desc: 'Fastest, optimized for spatial analysis' },
                        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Highest reasoning, best for complex layouts' },
                        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Balanced speed and accuracy' }
                      ].map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id as any)}
                          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                            selectedModel === model.id 
                              ? 'border-indigo-600 bg-indigo-50/50' 
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-bold text-sm ${selectedModel === model.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {model.name}
                            </span>
                            {selectedModel === model.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                          </div>
                          <p className="text-xs text-slate-500">{model.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button 
                    onClick={() => setIsBatchConfirmOpen(false)}
                    className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={batchReanalyze}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                  >
                    Start Analysis
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    )}

      <footer className="py-8 px-6 border-t border-slate-200 bg-white text-center text-slate-400 text-sm">
        <p>© 2026 Medama ITRAK Industry Standard Assistant • Powered by ISSA Standards & Industry Standards</p>
      </footer>
    </div>
  );
}
