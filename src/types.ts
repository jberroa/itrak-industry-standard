export enum RoomType {
  OFFICE = "Office",
  RESTROOM = "Restroom",
  LOBBY = "Lobby/Entrance",
  HALLWAY = "Hallway/Corridor",
  CONFERENCE = "Conference Room",
  BREAKROOM = "Breakroom/Kitchen",
  CLASSROOM = "Classroom",
  STAIRWELL = "Stairwell",
  STORAGE = "Storage/Utility",
  EXAM_ROOM = "Exam Room",
  PATIENT_ROOM = "Patient Room",
  SURGICAL_ROOM = "Surgical Room/OR",
  LABORATORY = "Laboratory",
  PHARMACY = "Pharmacy",
  RADIOLOGY = "Radiology/Imaging",
  OTHER = "Other"
}

export enum FlooringType {
  CARPET = "Carpet",
  VCT = "VCT Tile",
  LVT = "LVT/Plank",
  CERAMIC = "Ceramic Tile",
  CONCRETE = "Polished Concrete",
  EPOXY = "Epoxy/Resinous",
  RUBBER = "Rubber Flooring",
  SHEET_VINYL = "Sheet Vinyl"
}

export enum EquipmentType {
  MOP_BUCKET = "Mop & Bucket",
  WALK_BEHIND_SCRUBBER = "Walk-Behind Scrubber",
  RIDE_ON_SCRUBBER = "Ride-On Scrubber",
  WALK_BEHIND_BURNISHER = "Walk-Behind Burnisher",
  HAND_HELD_BURNISHER = "Hand-Held Burnisher",
  CARPET_EXTRACTOR = "Carpet Extractor",
  BACKPACK_VACUUM = "Backpack Vacuum"
}

export enum ServiceType {
  REGULAR = "Regular Clean",
  TERMINAL = "Terminal Clean",
  CYCLE = "Cycle Clean",
  POLICE = "Policing"
}

export interface ServiceOutlier {
  id: string;
  description: string;
  additionalMinutes: number;
  frequencyPerWeek: number;
}

export interface Room {
  id: string;
  name: string;
  floor: string;
  department: string;
  type: RoomType;
  flooringType: FlooringType;
  assignedEquipment: EquipmentType[];
  squareFootage: number;
  outliers?: string;
  cleaningFrequency: number; // Legacy/Total times per week
  serviceFrequencies: Record<ServiceType, number>; // times per week
  serviceOutliers?: ServiceOutlier[];
  productivityPenalty?: number; // Percentage impact on cleaning time
}

export interface Building {
  id: string;
  name: string;
  location: string;
  address?: string;
  numFloors?: number;
  rooms: Room[];
  lastModified: number;
  shiftTasks?: ShiftTask[];
  laborRates?: LaborRates;
}

export interface LaborRates {
  cleanerHourlyRate: number;
  floorCareHourlyRate: number;
  managerHourlyRate: number;
  taxBenefitsMultiplier: number; // e.g., 1.25 for 25% overhead
}

export interface ShiftTask {
  id: string;
  description: string;
  estimatedMinutes: number;
  shift: 'day' | 'evening' | 'night';
}

export interface CalculationResult {
  totalRooms: number;
  totalSquareFootage: number;
  totalCleaningHoursPerWeek: number;
  totalAnnualFloorCareHours: number;
  fteRequired: number;
  dailyCleaningFte: number;
  annualFloorCareFte: number;
  managersRequired: number;
  oversightHoursPerWeek: number;
  managerialLoadDescription: string;
  breakdownByFloor: Record<string, FloorBreakdown>;
  breakdownByType: Record<string, TypeBreakdown>;
  breakdownByShift: {
    day: ShiftData;
    evening: ShiftData;
    night: ShiftData;
  };
  breakdownByFlooring: Record<string, FlooringBreakdown>;
}

export interface FlooringBreakdown {
  squareFootage: number;
  fte: number;
  annualFloorCareHours: number;
}

export interface ShiftData {
  fte: number;
  managers: number;
  assignedTasks?: ShiftTask[];
}

export interface FloorBreakdown {
  squareFootage: number;
  fte: number;
}

export interface TypeBreakdown {
  count: number;
  squareFootage: number;
  fte: number;
}

export interface LidarHighlight {
  label: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  z?: number; // 0-100 percentage (height from floor)
  width: number; // 0-100 percentage
  height: number; // 0-100 percentage
  depth?: number; // 0-100 percentage
}

export interface LidarScan {
  id: string;
  timestamp: number;
  imageUrl: string; // Base64 or URL
  roomName: string;
  roomType: RoomType;
  squareFootage: number;
  volume?: number; // Cubic feet
  detectedObjects: string[];
  highlights?: LidarHighlight[];
  confidence: number;
  aiReasoning?: string;
  productivityPenalty?: number; // Percentage impact on cleaning time
  status: 'processed' | 'pending' | 'failed';
  notes?: string;
  pointCloudData?: number[][]; // Array of [x, y, z] points for reconstruction
}

export enum UserRole {
  ADMIN = "Admin",
  EDITOR = "Operator",
  VIEWER = "View-Only"
}

export interface UserProfile {
  id: string;
  name: string;
  passcode: string;
  role: UserRole;
  accessibleBuildingIds: string[]; // Empty means all for Admin, specific for Viewer
  createdAt: number;
}
