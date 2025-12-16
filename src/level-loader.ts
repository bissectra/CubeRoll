import type { FaceOrientationKey, FaceColorName } from "./cube-factory";

export interface LevelData {
  name: string;
  description: string;
  difficulty: number;
  parMoves: number;
  tags: string[];
  author: string;
  dateCreated: string;
  gridSize: number;
  cubes: Array<{
    id: number;
    position: { x: number; y: number };
    orientation: string;
  }>;
  goals: Array<{
    position: { x: number; y: number };
    color: string;
  }>;
}

const LEVEL_FILES = ["tutorial-01", "easy-corner"];

const VALID_FACE_COLORS: Set<string> = new Set([
  "red", "orange", "green", "blue", "white", "yellow"
]);

const VALID_FACE_ORIENTATIONS: Set<string> = new Set([
  "red:green", "red:blue", "red:white", "red:yellow",
  "orange:green", "orange:blue", "orange:white", "orange:yellow",
  "green:red", "green:orange", "green:white", "green:yellow",
  "blue:red", "blue:orange", "blue:white", "blue:yellow",
  "white:red", "white:orange", "white:green", "white:blue",
  "yellow:red", "yellow:orange", "yellow:green", "yellow:blue"
]);

export function isValidFaceColor(color: string): color is FaceColorName {
  return VALID_FACE_COLORS.has(color);
}

export function isValidFaceOrientation(orientation: string): orientation is FaceOrientationKey {
  return VALID_FACE_ORIENTATIONS.has(orientation);
}

let cachedLevels: Map<string, LevelData> | null = null;

export async function loadAllLevels(): Promise<Map<string, LevelData>> {
  if (cachedLevels) {
    return cachedLevels;
  }

  const levels = new Map<string, LevelData>();
  const baseUrl = import.meta.env.BASE_URL;

  for (const levelId of LEVEL_FILES) {
    try {
      const response = await fetch(`${baseUrl}levels/${levelId}.json`);
      if (!response.ok) {
        console.warn(`Failed to load level ${levelId}: ${response.statusText}`);
        continue;
      }
      const data: LevelData = await response.json();
      levels.set(levelId, data);
    } catch (error) {
      console.error(`Error loading level ${levelId}:`, error);
    }
  }

  cachedLevels = levels;
  return levels;
}

export async function loadLevel(levelId: string): Promise<LevelData | null> {
  const levels = await loadAllLevels();
  return levels.get(levelId) || null;
}

export function getLevelIds(): string[] {
  return [...LEVEL_FILES];
}
