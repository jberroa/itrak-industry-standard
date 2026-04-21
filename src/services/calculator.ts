import { Room, CalculationResult, FloorBreakdown, TypeBreakdown, RoomType, FlooringType, FlooringBreakdown, EquipmentType, ServiceType, ShiftTask } from "../types";
import { CLEANING_RATES, HOURS_PER_FTE_WEEK, FTE_PER_MANAGER, OVERSIGHT_HOURS_PER_EMPLOYEE, DEFAULT_FLOORING, ANNUAL_FLOOR_CARE_RATES, EQUIPMENT_PRODUCTIVITY, SERVICE_MULTIPLIERS } from "../constants/standards";

interface ShiftAllocation {
  day: number;
  evening: number;
  night: number;
}

function getShiftAllocation(type: RoomType): ShiftAllocation {
  switch (type) {
    case RoomType.EXAM_ROOM:
      return { day: 0.3, evening: 0.7, night: 0 }; // Policed day, cleaned evening
    case RoomType.SURGICAL_ROOM:
      return { day: 0, evening: 0, night: 1.0 }; // Terminally cleaned night
    case RoomType.OFFICE:
    case RoomType.CONFERENCE:
    case RoomType.CLASSROOM:
      return { day: 0, evening: 1.0, night: 0 }; // After hours cleaning
    case RoomType.RESTROOM:
    case RoomType.LOBBY:
    case RoomType.HALLWAY:
      return { day: 0.4, evening: 0.4, night: 0.2 }; // Continuous policing
    case RoomType.PATIENT_ROOM:
      return { day: 0.4, evening: 0.4, night: 0.2 }; // Discharge cleaning
    default:
      return { day: 0.2, evening: 0.6, night: 0.2 }; // Standard allocation
  }
}

export function calculateRequirements(rooms: Room[], shiftTasks: ShiftTask[] = []): CalculationResult {
  let totalSqFt = 0;
  let totalHoursPerWeek = 0;
  let totalAnnualFloorCareHours = 0;
  const breakdownByFloor: Record<string, FloorBreakdown> = {};
  const breakdownByType: Record<string, TypeBreakdown> = {};
  const breakdownByFlooring: Record<string, FlooringBreakdown> = {};
  
  let dayHours = 0;
  let eveningHours = 0;
  let nightHours = 0;

  rooms.forEach(room => {
    // Base cleaning rate
    let baseRate = CLEANING_RATES[room.type] || 25; // mins per 1000 sq ft
    
    // Adjust rate based on assigned equipment (use the most productive equipment assigned)
    if (room.assignedEquipment && room.assignedEquipment.length > 0) {
      const bestProductivity = Math.min(...room.assignedEquipment.map(eq => EQUIPMENT_PRODUCTIVITY[eq] || 1.0));
      baseRate = baseRate * bestProductivity;
    }

    // Apply productivity penalty from outliers (e.g., furniture density)
    if (room.productivityPenalty && room.productivityPenalty > 0) {
      baseRate = baseRate * (1 + (room.productivityPenalty / 100));
    }

    // Calculate hours for each service type
    let weeklyHours = 0;
    if (room.serviceFrequencies) {
      Object.entries(room.serviceFrequencies).forEach(([service, freq]) => {
        const multiplier = SERVICE_MULTIPLIERS[service as ServiceType] || 1.0;
        const serviceRate = baseRate * multiplier;
        const hoursPerService = (room.squareFootage / 1000) * (serviceRate / 60);
        weeklyHours += hoursPerService * freq;
      });
    } else {
      // Fallback to legacy cleaningFrequency if serviceFrequencies is missing
      const hoursPerCleaning = (room.squareFootage / 1000) * (baseRate / 60);
      weeklyHours = hoursPerCleaning * (room.cleaningFrequency || 0);
    }

    // Add service outliers
    if (room.serviceOutliers) {
      room.serviceOutliers.forEach(outlier => {
        const outlierWeeklyHours = (outlier.additionalMinutes / 60) * outlier.frequencyPerWeek;
        weeklyHours += outlierWeeklyHours;
      });
    }

    totalSqFt += room.squareFootage;
    totalHoursPerWeek += weeklyHours;

    // Shift allocation
    const allocation = getShiftAllocation(room.type);
    dayHours += weeklyHours * allocation.day;
    eveningHours += weeklyHours * allocation.evening;
    nightHours += weeklyHours * allocation.night;

    // Floor breakdown
    const floor = room.floor || "Unassigned";
    if (!breakdownByFloor[floor]) {
      breakdownByFloor[floor] = { squareFootage: 0, fte: 0 };
    }
    breakdownByFloor[floor].squareFootage += room.squareFootage;
    breakdownByFloor[floor].fte += weeklyHours / HOURS_PER_FTE_WEEK;

    // Type breakdown
    const type = room.type;
    if (!breakdownByType[type]) {
      breakdownByType[type] = { count: 0, squareFootage: 0, fte: 0 };
    }
    breakdownByType[type].count += 1;
    breakdownByType[type].squareFootage += room.squareFootage;
    breakdownByType[type].fte += weeklyHours / HOURS_PER_FTE_WEEK;

    // Flooring breakdown
    const flooring = room.flooringType || DEFAULT_FLOORING[room.type] || FlooringType.VCT;
    if (!breakdownByFlooring[flooring]) {
      breakdownByFlooring[flooring] = { squareFootage: 0, fte: 0, annualFloorCareHours: 0 };
    }
    breakdownByFlooring[flooring].squareFootage += room.squareFootage;
    breakdownByFlooring[flooring].fte += weeklyHours / HOURS_PER_FTE_WEEK;
    
    const annualRate = ANNUAL_FLOOR_CARE_RATES[flooring] || 0;
    const annualHours = (room.squareFootage / 1000) * annualRate;
    breakdownByFlooring[flooring].annualFloorCareHours += annualHours;
    totalAnnualFloorCareHours += annualHours;
  });

  // Calculate FTE from assigned shift tasks
  const totalShiftTaskMinutes = shiftTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
  const totalShiftTaskHoursPerWeek = totalShiftTaskMinutes / 60;

  const dailyCleaningFte = (totalHoursPerWeek + totalShiftTaskHoursPerWeek) / HOURS_PER_FTE_WEEK;
  const annualFloorCareFte = totalAnnualFloorCareHours / (HOURS_PER_FTE_WEEK * 52);
  const fteRequired = dailyCleaningFte + annualFloorCareFte;

  // Breakdown FTE by shift (including assigned tasks)
  const calculateShiftFte = (weeklyHours: number, shift: 'day' | 'evening' | 'night') => {
    const shiftTaskMinutes = shiftTasks.filter(t => t.shift === shift).reduce((acc, t) => acc + t.estimatedMinutes, 0);
    const shiftTotalWeeklyHours = weeklyHours + (shiftTaskMinutes / 60);
    return shiftTotalWeeklyHours / HOURS_PER_FTE_WEEK;
  };

  const dayFte = calculateShiftFte(dayHours, 'day');
  const eveningFte = calculateShiftFte(eveningHours, 'evening');
  const nightFte = calculateShiftFte(nightHours, 'night');
  
  // Manager calculation: Base ratio + oversight hours
  const calculateManagers = (fte: number) => {
    if (fte === 0) return 0;
    const baseManagers = fte / FTE_PER_MANAGER;
    const oversightHours = fte * OVERSIGHT_HOURS_PER_EMPLOYEE;
    const oversightManagers = oversightHours / HOURS_PER_FTE_WEEK;
    return baseManagers + oversightManagers;
  };

  const managersRequired = calculateManagers(fteRequired);
  const dayManagers = calculateManagers(dayFte);
  const eveningManagers = calculateManagers(eveningFte);
  const nightManagers = calculateManagers(nightFte);

  const oversightHoursPerWeek = fteRequired * OVERSIGHT_HOURS_PER_EMPLOYEE;
  const managerialLoadDescription = `Includes employee coaching, quality inspections, and safety compliance documentation for ${fteRequired.toFixed(1)} FTEs (Daily Cleaning + Annual Floor Care).`;

  return {
    totalRooms: rooms.length,
    totalSquareFootage: totalSqFt,
    totalCleaningHoursPerWeek: totalHoursPerWeek,
    totalAnnualFloorCareHours,
    fteRequired,
    dailyCleaningFte,
    annualFloorCareFte,
    managersRequired,
    oversightHoursPerWeek,
    managerialLoadDescription,
    breakdownByFloor,
    breakdownByType,
    breakdownByShift: {
      day: { fte: dayFte, managers: dayManagers, assignedTasks: shiftTasks.filter(t => t.shift === 'day') },
      evening: { fte: eveningFte, managers: eveningManagers, assignedTasks: shiftTasks.filter(t => t.shift === 'evening') },
      night: { fte: nightFte, managers: nightManagers, assignedTasks: shiftTasks.filter(t => t.shift === 'night') }
    },
    breakdownByFlooring
  };
}
