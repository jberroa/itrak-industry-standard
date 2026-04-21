import { GoogleGenAI, Type } from "@google/genai";
import { Room, RoomType, LidarScan } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeRoomImage(base64Data: string, mimeType: string): Promise<Partial<Room>[]> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze this image (could be a room photo or a blueprint). 
  Extract room information including:
  - Room Name (or number)
  - Room Type (Choose from: Office, Restroom, Lobby/Entrance, Hallway/Corridor, Conference Room, Breakroom/Kitchen, Classroom, Stairwell, Storage/Utility, Exam Room, Patient Room, Surgical Room/OR, Laboratory, Pharmacy, Radiology/Imaging, Other)
  - Estimated Square Footage (if it's a blueprint, look for dimensions. if it's a photo, estimate based on standard sizes)
  - Floor number (if indicated)
  - Department (if indicated)
  - Outliers (e.g., floor-to-ceiling windows, specialized equipment, high ceilings)

  Return the data as a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            squareFootage: { type: Type.NUMBER },
            floor: { type: Type.STRING },
            department: { type: Type.STRING },
            outliers: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      ...item,
      type: mapStringToRoomType(item.type),
      squareFootage: Number(String(item.squareFootage || "0").replace(/[^0-9.]/g, '')) || 0
    }));
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

function mapStringToRoomType(typeStr: string): RoomType {
  if (!typeStr) return RoomType.OTHER;
  const s = typeStr.toLowerCase().trim();
  
  // Direct matches
  if (s === "office") return RoomType.OFFICE;
  if (s === "restroom") return RoomType.RESTROOM;
  if (s === "lobby" || s === "entrance") return RoomType.LOBBY;
  if (s === "hallway" || s === "corridor") return RoomType.HALLWAY;
  if (s === "conference" || s === "conference room") return RoomType.CONFERENCE;
  if (s === "breakroom" || s === "kitchen") return RoomType.BREAKROOM;
  if (s === "classroom") return RoomType.CLASSROOM;
  if (s === "stairwell") return RoomType.STAIRWELL;
  if (s === "storage" || s === "utility") return RoomType.STORAGE;
  if (s === "exam room") return RoomType.EXAM_ROOM;
  if (s === "patient room") return RoomType.PATIENT_ROOM;
  if (s === "surgical room" || s === "or") return RoomType.SURGICAL_ROOM;
  if (s === "laboratory" || s === "lab") return RoomType.LABORATORY;
  if (s === "pharmacy") return RoomType.PHARMACY;
  if (s === "radiology" || s === "imaging") return RoomType.RADIOLOGY;

  // Keyword-based matching
  const mappings: { keywords: string[], type: RoomType }[] = [
    { keywords: ["office", "workstation", "cubicle", "admin", "desk"], type: RoomType.OFFICE },
    { keywords: ["restroom", "bath", "toilet", "washroom", "lavatory", "wc", "powder"], type: RoomType.RESTROOM },
    { keywords: ["lobby", "entrance", "reception", "waiting", "atrium", "foyer", "vestibule"], type: RoomType.LOBBY },
    { keywords: ["hall", "corridor", "aisle", "passage", "walkway", "breezeway"], type: RoomType.HALLWAY },
    { keywords: ["conf", "meeting", "boardroom", "seminar", "huddle", "briefing"], type: RoomType.CONFERENCE },
    { keywords: ["break", "kitchen", "cafe", "dining", "lunch", "pantry", "canteen"], type: RoomType.BREAKROOM },
    { keywords: ["class", "lecture", "training", "instruction", "study", "classroom"], type: RoomType.CLASSROOM },
    { keywords: ["stair", "steps", "staircase", "stairwell"], type: RoomType.STAIRWELL },
    { keywords: ["store", "utility", "closet", "janitor", "supply", "mechanical", "electrical", "it room", "server", "custodial", "maint"], type: RoomType.STORAGE },
    { keywords: ["exam", "consultation", "triage", "treatment"], type: RoomType.EXAM_ROOM },
    { keywords: ["patient", "ward", "recovery", "bedroom", "resident", "icu", "nicu"], type: RoomType.PATIENT_ROOM },
    { keywords: ["surgical", " or ", "operating", "theater", "theatre", "scrub", "surgery"], type: RoomType.SURGICAL_ROOM },
    { keywords: ["lab", "research", "testing", "pathology", "laboratory"], type: RoomType.LABORATORY },
    { keywords: ["pharmacy", "dispensary", "medication", "meds"], type: RoomType.PHARMACY },
    { keywords: ["radio", "imaging", "x-ray", "mri", "ct", "ultrasound", "nuclear", "scan"], type: RoomType.RADIOLOGY }
  ];

  for (const mapping of mappings) {
    if (mapping.keywords.some(kw => s.includes(kw))) {
      return mapping.type;
    }
  }

  return RoomType.OTHER;
}

export async function analyzeLidarMap(base64Data: string, mimeType: string, modelName: string = "gemini-3-flash-preview"): Promise<Partial<LidarScan>[]> {
  const model = modelName;
  
  const prompt = `Analyze this LiDAR scan map (2D occupancy grid or point cloud visualization).
  1. Identify the room boundaries in 3D space.
  2. Calculate the estimated square footage and total volume (cubic feet) based on the scale or standard proportions.
  3. Perform object recognition: Identify common room items such as desks, chairs, tables, medical equipment, storage racks, or specialized machinery.
  4. Categorize these identified objects as "Productivity Impacts" (outliers) that increase cleaning time or require specialized floor care.
  5. Estimate a "Productivity Penalty" percentage (0-100%) representing how much these objects slow down standard cleaning tasks in this specific room.
  6. For each identified "Productivity Impact" or outlier, provide its 3D bounding box coordinates. Use percentage values (0-100) for x, y, z (height from floor), width, height, and depth.
  7. Generate a sparse point cloud (approx 50-100 points) representing the room's main structural features (walls, corners) as [x, y, z] coordinates.
  8. If multiple rooms are visible, list them separately.

  Return the data as a JSON array of objects with:
  - name: Room name
  - type: Room type (Office, Restroom, Lobby, Hallway, etc.)
  - squareFootage: Number
  - volume: Number (cubic feet)
  - outliers: String description of detected objects and features
  - productivityPenalty: Number (estimated percentage increase in cleaning time)
  - reasoning: Short explanation of why this room type and penalty were chosen
  - highlights: Array of objects with { label: string, x: number, y: number, z: number, width: number, height: number, depth: number }
  - pointCloud: Array of [x, y, z] coordinates (0-100 scale)
  - confidence: Number (0-1)`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            squareFootage: { type: Type.NUMBER },
            volume: { type: Type.NUMBER },
            outliers: { type: Type.STRING },
            productivityPenalty: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  z: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  depth: { type: Type.NUMBER }
                }
              }
            },
            pointCloud: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER }
              }
            },
            confidence: { type: Type.NUMBER }
          }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      roomName: item.name,
      roomType: mapStringToRoomType(item.type),
      squareFootage: Number(item.squareFootage) || 0,
      volume: Number(item.volume) || 0,
      detectedObjects: item.outliers ? item.outliers.split(',').map((s: string) => s.trim()) : [],
      aiReasoning: item.reasoning,
      productivityPenalty: Number(item.productivityPenalty) || 0,
      highlights: item.highlights,
      pointCloudData: item.pointCloud,
      confidence: Number(item.confidence) || 0
    }));
  } catch (e) {
    console.error("Failed to parse Lidar response", e);
    return [];
  }
}
