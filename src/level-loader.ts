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
