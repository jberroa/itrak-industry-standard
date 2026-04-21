import { RoomType, FlooringType, EquipmentType, ServiceType } from "../types";

// ISSA Cleaning Times (Simplified examples in minutes per 1000 sq ft)
// These are rough estimates based on industry standards for "Level 2" cleaning
export const CLEANING_RATES: Record<RoomType, number> = {
  [RoomType.OFFICE]: 24, // 24 mins per 1000 sq ft
  [RoomType.RESTROOM]: 120, // 120 mins per 1000 sq ft (high intensity)
  [RoomType.LOBBY]: 30,
  [RoomType.HALLWAY]: 15,
  [RoomType.CONFERENCE]: 20,
  [RoomType.BREAKROOM]: 45,
  [RoomType.CLASSROOM]: 30,
  [RoomType.STAIRWELL]: 60,
  [RoomType.STORAGE]: 10,
  [RoomType.EXAM_ROOM]: 60, // 60 mins per 1000 sq ft (disinfection)
  [RoomType.PATIENT_ROOM]: 90, // 90 mins per 1000 sq ft (high disinfection)
  [RoomType.SURGICAL_ROOM]: 240, // 240 mins per 1000 sq ft (extremely high)
  [RoomType.LABORATORY]: 60,
  [RoomType.PHARMACY]: 60,
  [RoomType.RADIOLOGY]: 50,
  [RoomType.OTHER]: 25,
};

// Default flooring types for each room type
export const DEFAULT_FLOORING: Record<RoomType, FlooringType> = {
  [RoomType.OFFICE]: FlooringType.CARPET,
  [RoomType.RESTROOM]: FlooringType.CERAMIC,
  [RoomType.LOBBY]: FlooringType.LVT,
  [RoomType.HALLWAY]: FlooringType.VCT,
  [RoomType.CONFERENCE]: FlooringType.CARPET,
  [RoomType.BREAKROOM]: FlooringType.LVT,
  [RoomType.CLASSROOM]: FlooringType.VCT,
  [RoomType.STAIRWELL]: FlooringType.CONCRETE,
  [RoomType.STORAGE]: FlooringType.CONCRETE,
  [RoomType.EXAM_ROOM]: FlooringType.VCT,
  [RoomType.PATIENT_ROOM]: FlooringType.SHEET_VINYL,
  [RoomType.SURGICAL_ROOM]: FlooringType.EPOXY,
  [RoomType.LABORATORY]: FlooringType.EPOXY,
  [RoomType.PHARMACY]: FlooringType.SHEET_VINYL,
  [RoomType.RADIOLOGY]: FlooringType.VCT,
  [RoomType.OTHER]: FlooringType.VCT,
};

// Annual Floor Care Hours (hours per 1000 sq ft per year)
// Includes stripping, waxing, deep extraction, etc.
export const ANNUAL_FLOOR_CARE_RATES: Record<FlooringType, number> = {
  [FlooringType.CARPET]: 6, // 2 extractions per year @ 3 hrs each
  [FlooringType.VCT]: 12, // 1 strip/wax (8 hrs) + 1 scrub/recoat (4 hrs)
  [FlooringType.LVT]: 4, // 2 scrub/recoats per year
  [FlooringType.CERAMIC]: 8, // 2 deep grout cleanings
  [FlooringType.CONCRETE]: 3, // 1 scrub/seal
  [FlooringType.EPOXY]: 2, // 1 deep scrub
  [FlooringType.RUBBER]: 4, // 2 deep scrubs
  [FlooringType.SHEET_VINYL]: 6, // 2 scrub/recoats
};

// Default equipment assignments for each room type
export const DEFAULT_EQUIPMENT: Record<RoomType, EquipmentType[]> = {
  [RoomType.OFFICE]: [EquipmentType.BACKPACK_VACUUM, EquipmentType.MOP_BUCKET],
  [RoomType.RESTROOM]: [EquipmentType.MOP_BUCKET],
  [RoomType.LOBBY]: [EquipmentType.WALK_BEHIND_SCRUBBER, EquipmentType.WALK_BEHIND_BURNISHER],
  [RoomType.HALLWAY]: [EquipmentType.RIDE_ON_SCRUBBER, EquipmentType.WALK_BEHIND_BURNISHER],
  [RoomType.CONFERENCE]: [EquipmentType.BACKPACK_VACUUM],
  [RoomType.BREAKROOM]: [EquipmentType.WALK_BEHIND_SCRUBBER],
  [RoomType.CLASSROOM]: [EquipmentType.WALK_BEHIND_SCRUBBER],
  [RoomType.STAIRWELL]: [EquipmentType.MOP_BUCKET],
  [RoomType.STORAGE]: [EquipmentType.MOP_BUCKET],
  [RoomType.EXAM_ROOM]: [EquipmentType.MOP_BUCKET, EquipmentType.HAND_HELD_BURNISHER],
  [RoomType.PATIENT_ROOM]: [EquipmentType.MOP_BUCKET, EquipmentType.HAND_HELD_BURNISHER],
  [RoomType.SURGICAL_ROOM]: [EquipmentType.MOP_BUCKET],
  [RoomType.LABORATORY]: [EquipmentType.WALK_BEHIND_SCRUBBER],
  [RoomType.PHARMACY]: [EquipmentType.MOP_BUCKET],
  [RoomType.RADIOLOGY]: [EquipmentType.MOP_BUCKET],
  [RoomType.OTHER]: [EquipmentType.MOP_BUCKET],
};

// Equipment Productivity Adjustments (Multipliers for cleaning rates)
// A multiplier < 1 means faster cleaning (less time per 1000 sq ft)
export const EQUIPMENT_PRODUCTIVITY: Record<EquipmentType, number> = {
  [EquipmentType.MOP_BUCKET]: 1.0, // Baseline
  [EquipmentType.WALK_BEHIND_SCRUBBER]: 0.5, // 2x faster than mopping
  [EquipmentType.RIDE_ON_SCRUBBER]: 0.25, // 4x faster than mopping
  [EquipmentType.WALK_BEHIND_BURNISHER]: 0.6,
  [EquipmentType.HAND_HELD_BURNISHER]: 0.9,
  [EquipmentType.CARPET_EXTRACTOR]: 1.0,
  [EquipmentType.BACKPACK_VACUUM]: 0.8,
};

// Service Multipliers (Relative to Regular Cleaning Rate)
export const SERVICE_MULTIPLIERS: Record<ServiceType, number> = {
  [ServiceType.REGULAR]: 1.0,
  [ServiceType.TERMINAL]: 3.0, // Terminal cleaning takes much longer
  [ServiceType.CYCLE]: 1.5,
  [ServiceType.POLICE]: 0.3, // Policing is quick
};

// Default service frequencies for each room type
export const DEFAULT_SERVICES: Record<RoomType, Record<ServiceType, number>> = {
  [RoomType.OFFICE]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.RESTROOM]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 5 },
  [RoomType.LOBBY]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 10 },
  [RoomType.HALLWAY]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 10 },
  [RoomType.CONFERENCE]: { [ServiceType.REGULAR]: 3, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.BREAKROOM]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 5 },
  [RoomType.CLASSROOM]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.STAIRWELL]: { [ServiceType.REGULAR]: 2, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.STORAGE]: { [ServiceType.REGULAR]: 1, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.EXAM_ROOM]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 1, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 5 },
  [RoomType.PATIENT_ROOM]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 1, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 5 },
  [RoomType.SURGICAL_ROOM]: { [ServiceType.REGULAR]: 0, [ServiceType.TERMINAL]: 5, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.LABORATORY]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.PHARMACY]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.RADIOLOGY]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
  [RoomType.OTHER]: { [ServiceType.REGULAR]: 5, [ServiceType.TERMINAL]: 0, [ServiceType.CYCLE]: 0, [ServiceType.POLICE]: 0 },
};

// Standard FTE hours (40 hours per week)
export const HOURS_PER_FTE_WEEK = 40;

// Manager ratio (1 manager per X FTEs)
export const FTE_PER_MANAGER = 12;

// Manager oversight hours per employee per week (coaching, training, etc.)
export const OVERSIGHT_HOURS_PER_EMPLOYEE = 2;

// Default Labor Rates (Pay per role)
export const DEFAULT_LABOR_RATES = {
  cleanerHourlyRate: 18.50,
  floorCareHourlyRate: 22.00,
  managerHourlyRate: 35.00,
  taxBenefitsMultiplier: 1.28 // Default 28% for taxes, insurance, and benefits
};
