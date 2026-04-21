import * as XLSX from 'xlsx';
import { Room, RoomType } from '../types';

export async function parseExcelFile(file: File): Promise<Partial<Room>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const rooms: Partial<Room>[] = jsonData.map((row: any) => {
          // Normalize row keys for easier matching
          const normalizedRow: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            // Remove all non-alphanumeric characters for maximum matching potential
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalizedRow[normalizedKey] = row[key];
          });

          const findValue = (aliases: string[]) => {
            for (const alias of aliases) {
              const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normalizedRow[cleanAlias] !== undefined) return normalizedRow[cleanAlias];
            }
            return undefined;
          };

          const name = findValue(['name', 'room', 'roomname', 'roomnumber', 'number', 'id', 'room#', 'rm', 'rm#', 'space']);
          const floor = findValue(['floor', 'floornumber', 'level', 'story', 'flr', 'fl']);
          const department = findValue(['department', 'dept', 'division', 'unit', 'cost center', 'cc']);
          const typeRaw = findValue(['type', 'roomtype', 'category', 'usage', 'function', 'roomcategory', 'description', 'desc', 'class']);
          const sqftRaw = findValue(['squarefootage', 'sqft', 'area', 'size', 'squarefeet', 'sf', 'sqfootage', 'sqfeet', 'squarefoot', 'sqfoot', 'footage']);
          const outliersRaw = findValue(['outliers', 'notes', 'comments', 'remarks', 'special', 'exceptions', 'outlier']);

          const parsedSqft = Number(String(sqftRaw || "0").replace(/[^0-9.]/g, ''));

          return {
            name: String(name || "Unnamed Room"),
            floor: String(floor || ""),
            department: String(department || ""),
            type: mapStringToRoomType(String(typeRaw || name || "")), // Use name as fallback for type detection
            squareFootage: isNaN(parsedSqft) ? 0 : parsedSqft,
            outliers: String(outliersRaw || "")
          };
        });

        resolve(rooms);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function exportToExcel(building: any, results: any) {
  const wb = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    ['Building Name', building.name],
    ['Location', building.location],
    ['Total FTE Required', results.fteRequired.toFixed(2)],
    ['Managers Needed', results.managersRequired.toFixed(1)],
    ['Total Rooms', results.totalRooms],
    ['Total Sq Footage', results.totalSquareFootage],
    ['Weekly Cleaning Hours', results.totalCleaningHoursPerWeek.toFixed(1)],
    ['Weekly Oversight Hours', results.oversightHoursPerWeek.toFixed(1)],
    ['Managerial Load', results.managerialLoadDescription]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Floor Breakdown Sheet
  const floorData = [['Floor', 'Square Footage', 'FTE Required']];
  Object.entries(results.breakdownByFloor).forEach(([floor, data]: [string, any]) => {
    floorData.push([floor, data.squareFootage, data.fte.toFixed(2)]);
  });
  const wsFloor = XLSX.utils.aoa_to_sheet(floorData);
  XLSX.utils.book_append_sheet(wb, wsFloor, 'Floor Breakdown');

  // Room Type Breakdown Sheet
  const typeData = [['Room Type', 'Count', 'Square Footage', 'FTE Required']];
  Object.entries(results.breakdownByType).forEach(([type, data]: [string, any]) => {
    typeData.push([type, data.count, data.squareFootage, data.fte.toFixed(2)]);
  });
  const wsType = XLSX.utils.aoa_to_sheet(typeData);
  XLSX.utils.book_append_sheet(wb, wsType, 'Type Breakdown');

  // Shift Breakdown Sheet
  const shiftData = [['Shift', 'Hours', 'Staff (FTE)', 'Managers']];
  shiftData.push(['Day Shift (7am-3pm)', (results.breakdownByShift.day.fte * 40).toFixed(1), results.breakdownByShift.day.fte.toFixed(2), results.breakdownByShift.day.managers.toFixed(1)]);
  shiftData.push(['Evening Shift (3pm-11pm)', (results.breakdownByShift.evening.fte * 40).toFixed(1), results.breakdownByShift.evening.fte.toFixed(2), results.breakdownByShift.evening.managers.toFixed(1)]);
  shiftData.push(['Night Shift (11pm-7am)', (results.breakdownByShift.night.fte * 40).toFixed(1), results.breakdownByShift.night.fte.toFixed(2), results.breakdownByShift.night.managers.toFixed(1)]);
  const wsShift = XLSX.utils.aoa_to_sheet(shiftData);
  XLSX.utils.book_append_sheet(wb, wsShift, 'Shift Breakdown');

  // Flooring Breakdown Sheet
  const flooringData = [['Flooring Type', 'Square Footage', 'Annual Floor Care Hours']];
  Object.entries(results.breakdownByFlooring).forEach(([flooring, data]: [string, any]) => {
    flooringData.push([flooring, data.squareFootage, data.annualFloorCareHours.toFixed(1)]);
  });
  const wsFlooring = XLSX.utils.aoa_to_sheet(flooringData);
  XLSX.utils.book_append_sheet(wb, wsFlooring, 'Flooring Breakdown');

  // Room Inventory Sheet
  const inventoryData: (string | number)[][] = [['Room Name', 'Type', 'Flooring', 'Floor', 'Square Footage', 'Cleaning Frequency', 'Outliers']];
  building.rooms.forEach((room: Room) => {
    inventoryData.push([
      room.name,
      room.type,
      room.flooringType,
      room.floor,
      room.squareFootage,
      room.cleaningFrequency,
      room.outliers || ''
    ]);
  });
  const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Room Inventory');

  // Generate and download file
  XLSX.writeFile(wb, `${building.name || 'Building'}_Analysis_Report.xlsx`);
}

function mapStringToRoomType(typeStr: string): RoomType {
  const s = String(typeStr).toLowerCase();
  if (s.includes("office") || s.includes("workstation") || s.includes("admin") || s.includes("desk")) return RoomType.OFFICE;
  if (s.includes("restroom") || s.includes("bath") || s.includes("toilet") || s.includes("lavatory") || s.includes("powder")) return RoomType.RESTROOM;
  if (s.includes("lobby") || s.includes("entrance") || s.includes("reception") || s.includes("foyer") || s.includes("waiting")) return RoomType.LOBBY;
  if (s.includes("hall") || s.includes("corridor") || s.includes("passage") || s.includes("aisle")) return RoomType.HALLWAY;
  if (s.includes("conf") || s.includes("meeting") || s.includes("boardroom") || s.includes("huddle")) return RoomType.CONFERENCE;
  if (s.includes("break") || s.includes("kitchen") || s.includes("pantry") || s.includes("dining") || s.includes("cafeteria") || s.includes("lunch")) return RoomType.BREAKROOM;
  if (s.includes("class") || s.includes("lecture") || s.includes("training") || s.includes("seminar")) return RoomType.CLASSROOM;
  if (s.includes("stair") || s.includes("step") || s.includes("exit")) return RoomType.STAIRWELL;
  if (s.includes("store") || s.includes("utility") || s.includes("closet") || s.includes("mechanical") || s.includes("electrical") || s.includes("janitor") || s.includes("it room") || s.includes("server")) return RoomType.STORAGE;
  if (s.includes("exam") || s.includes("treatment") || s.includes("consult")) return RoomType.EXAM_ROOM;
  if (s.includes("patient") || s.includes("ward") || s.includes("icu") || s.includes("nicu") || s.includes("recovery")) return RoomType.PATIENT_ROOM;
  if (s.includes("surgical") || s.includes(" or ") || s.includes("operating") || s.includes("sterile") || s.includes("scrub")) return RoomType.SURGICAL_ROOM;
  if (s.includes("lab") || s.includes("specimen") || s.includes("blood") || s.includes("pathology")) return RoomType.LABORATORY;
  if (s.includes("pharmacy") || s.includes("medication") || s.includes("med room")) return RoomType.PHARMACY;
  if (s.includes("radio") || s.includes("imaging") || s.includes("x-ray") || s.includes("mri") || s.includes("ct scan") || s.includes("ultrasound")) return RoomType.RADIOLOGY;
  return RoomType.OTHER;
}
