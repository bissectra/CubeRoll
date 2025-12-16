import p5 from "p5";
import {
  drawCube,
  drawFloor,
  DIRECTIONAL_ORIENTATION_MAPS,
  ORIENTATION_QUATERNIONS,
  Direction,
  FaceOrientationKey,
  FaceColorName,
} from "./cube-factory";
import {
  GRID_SPACING,
  getDefaultGridSize,
  getGridCells,
  getGridRadius,
  getGridSizeOptions,
  setGridCells,
} from "./grid-config";
import { quaternionSlerp, type Quaternion } from "./quaternions";
import {
  playBlockedSound,
  playMoveSound,
  playLevelCompleteSound,
  unlockAudioContext,
} from "./sounds";
import { sanitizeSeedValue, getTodaySeedValue, sanitizeLevelId } from "./params";
import { loadLevel, getLevelIds, type LevelData, isValidFaceColor, isValidFaceOrientation } from "./level-loader";

const DRAG_DISTANCE_THRESHOLD = 18;
const ANIMATION_DURATION_MS = 220;
const CUBE_PICK_RADIUS = GRID_SPACING * 0.6;
const FACE_ORIENTATION_KEYS = Object.keys(
  ORIENTATION_QUATERNIONS
) as FaceOrientationKey[];
const GOAL_COLORS: FaceColorName[] = [
  "red",
  "orange",
  "green",
  "blue",
  "white",
  "yellow",
];
const DEFAULT_INITIAL_CUBE_COUNT = 1;

const parseNumberParam = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const hashSeedString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
  }
  return hash >>> 0;
};

const ensureUrlParams = (gridSize: number, countParam: number, seedValue: string, levelId: string | null = null) => {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const currentParams = new URLSearchParams(url.search);

  const orderedParams = new URLSearchParams();
  
  if (levelId) {
    orderedParams.set("level", levelId);
  } else {
    orderedParams.set("m", String(gridSize));
    orderedParams.set("n", String(countParam));
    orderedParams.set("seed", seedValue);
  }

  currentParams.forEach((value, key) => {
    if (["m", "n", "seed", "level"].includes(key)) return;
    orderedParams.set(key, value);
  });

  const newSearch = orderedParams.toString();
  if (newSearch !== url.search.substring(1)) {
    url.search = newSearch;
    window.history.replaceState(window.history.state, "", url.toString());
  }
};

const getInitialParams = () => {
  const params =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  
  // Check if we're loading a curated level
  const requestedLevelId = sanitizeLevelId(params.get("level"));
  
  if (requestedLevelId) {
    // Curated level mode - gridSize, count, and seed will be determined by the level file
    return {
      gridSize: getDefaultGridSize(), // Will be updated after loading
      count: DEFAULT_INITIAL_CUBE_COUNT, // Will be updated after loading
      seedValue: getTodaySeedValue(), // Not used for curated levels
      seed: 0, // Not used for curated levels
      levelId: requestedLevelId,
    };
  }
  
  // Procedural generation mode
  const requestedGrid = parseNumberParam(
    params.get("m"),
    getDefaultGridSize()
  );
  const validGridSizes = getGridSizeOptions();
  const safeGrid = validGridSizes.includes(requestedGrid)
    ? requestedGrid
    : getDefaultGridSize();
  setGridCells(safeGrid);

  const requestedSeedValue = params.get("seed") ?? getTodaySeedValue();
  const safeSeedValue = sanitizeSeedValue(requestedSeedValue);
  const unlockedLimit = getUnlockedLevelLimitFor(safeGrid, safeSeedValue);
  const requestedCountParam = params.get("n");
  const requestedCount =
    requestedCountParam === null
      ? unlockedLimit
      : parseNumberParam(requestedCountParam, DEFAULT_INITIAL_CUBE_COUNT);
  const totalCells = getGridCells() * getGridCells();
  const safeCount = Math.min(
    totalCells,
    unlockedLimit,
    Math.max(0, requestedCount)
  );

  ensureUrlParams(safeGrid, safeCount, safeSeedValue, null);

  return {
    gridSize: safeGrid,
    count: safeCount,
    seedValue: safeSeedValue,
    seed: hashSeedString(safeSeedValue),
    levelId: null,
  };
};

const directionOffsets: Record<Direction, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};
const oppositeDirection: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

type HistoryRemoval = {
  entry: MoveHistoryEntry;
  index: number;
};

type CubePosition = { x: number; y: number };

export type DragState = {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type CubeState = {
  id: number;
  position: CubePosition;
  orientation: FaceOrientationKey;
};

type AnimatedCubeRender = {
  cubeId: number;
  position: CubePosition;
  rotation: Quaternion;
};

type AnimationState = {
  cubeId: number;
  startTime: number;
  duration: number;
  fromPosition: CubePosition;
  toPosition: CubePosition;
  fromOrientation: FaceOrientationKey;
  toOrientation: FaceOrientationKey;
};

type Goal = {
  position: CubePosition;
  color: FaceColorName;
};

type MoveHistoryEntry = {
  cubeId: number;
  direction: Direction;
};

type MoveOptions = {
  recordHistory?: boolean;
  skipOppositeCheck?: boolean;
};

type PersistedState = {
  cubes: CubeState[];
  goals: Goal[];
  moveHistory: MoveHistoryEntry[];
};

type BestSolution = {
  completedAt: number;
  moveHistory: MoveHistoryEntry[];
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
};

const buildStorageKey = (
  gridSize: number,
  count: number,
  seedValue: string
) => `${gridSize}:${count}:${seedValue}`;

const buildBestSolutionKey = (baseKey: string) => `${baseKey}:bestSolution`;

function buildLevelBestSolutionKey(
  gridSize: number,
  count: number,
  seedValue: string
) {
  return buildBestSolutionKey(buildStorageKey(gridSize, count, seedValue));
}

function hasStoredBestSolutionForLevel(
  gridSize: number,
  count: number,
  seedValue: string
) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return false;
  }
  const key = buildLevelBestSolutionKey(gridSize, count, seedValue);
  return window.localStorage.getItem(key) !== null;
}

function countCompletedLevelsFor(gridSize: number, seedValue: string) {
  const totalCells = gridSize * gridSize;
  let completed = 0;
  for (let level = 1; level <= totalCells; level += 1) {
    if (!hasStoredBestSolutionForLevel(gridSize, level, seedValue)) {
      break;
    }
    completed += 1;
  }
  return completed;
}

function getUnlockedLevelLimitFor(gridSize: number, seedValue: string) {
  const totalCells = gridSize * gridSize;
  const completed = countCompletedLevelsFor(gridSize, seedValue);
  return Math.max(
    1,
    Math.min(totalCells, completed + 1)
  );
}

const loadPersistedState = (key: string): PersistedState | null => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
};

const savePersistedState = (key: string, state: PersistedState) => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // best effort only
  }
};

const loadBestSolution = (key: string): BestSolution | null => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as BestSolution;
  } catch {
    return null;
  }
};

const saveBestSolution = (key: string, solution: BestSolution | null) => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(solution));
  } catch {
    // best effort only
  }
};

const generateLevel = (
  gridCells: number,
  count: number,
  seed: number
): { cubes: CubeState[]; goals: Goal[] } => {
  const totalCells = gridCells * gridCells;
  const targetCount = Math.min(count, totalCells);
  if (targetCount <= 0) {
    return { cubes: [], goals: [] };
  }

  const rng = mulberry32(seed);
  const positions: CubePosition[] = [];
  for (let y = 0; y < gridCells; y++) {
    for (let x = 0; x < gridCells; x++) {
      positions.push({ x, y });
    }
  }

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const cubes: CubeState[] = [];
  for (let index = 0; index < targetCount; index++) {
    const position = positions[index];
    const orientation =
      FACE_ORIENTATION_KEYS[
        Math.floor(rng() * FACE_ORIENTATION_KEYS.length)
      ];
    cubes.push({
      id: index + 1,
      position,
      orientation,
    });
  }

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  const goals: Goal[] = [];
  for (let index = 0; index < targetCount; index++) {
    const position = positions[index];
    const color =
      GOAL_COLORS[Math.floor(rng() * GOAL_COLORS.length)];
    goals.push({ position, color });
  }

  return { cubes, goals };
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export class MovementManager {
  private cubes: CubeState[] = [];
  private animationState: AnimationState | null = null;
  private dragTargetId: number | null = null;
  private dragState: DragState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  };
  private gridSize: number;
  private count: number;
  private seedValue: string;
  private seed: number;
  private levelId: string | null = null;
  private currentLevelData: LevelData | null = null;
  private moveHistory: MoveHistoryEntry[] = [];
  private goals: Goal[] = [];
  private storageKey: string | null = null;
  private bestSolution: BestSolution | null = null;
  private bestSolutionKey: string | null = null;

  constructor(private readonly p: p5) {
    const params = getInitialParams();
    this.gridSize = params.gridSize;
    this.count = params.count;
    this.seedValue = params.seedValue;
    this.seed = params.seed;
    this.levelId = params.levelId;
    // Fire-and-forget async initialization
    // The p5 draw loop won't start until the first frame, giving time for this to complete
    void this.loadLevelState();
  }

  private resetDragState() {
    this.animationState = null;
    this.dragTargetId = null;
    this.dragState = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    };
  }

  private ensureCountWithinUnlockedRange() {
    const unlockedLimit = getUnlockedLevelLimitFor(this.gridSize, this.seedValue);
    if (this.count > unlockedLimit) {
      this.count = unlockedLimit;
    }
  }

  private fallbackToProceduralGeneration() {
    this.levelId = null;
    this.currentLevelData = null;
    ensureUrlParams(this.gridSize, this.count, this.seedValue, null);
  }

  private async loadLevelState(useStored = true) {
    // If we're in curated level mode, load the level file
    if (this.levelId) {
      const levelData = await loadLevel(this.levelId);
      if (!levelData) {
        console.error(`Failed to load level: ${this.levelId}`);
        this.fallbackToProceduralGeneration();
        // Continue with procedural generation below
      } else {
        // Successfully loaded curated level
        this.currentLevelData = levelData;
        this.gridSize = levelData.gridSize;
        this.count = levelData.cubes.length;
        setGridCells(this.gridSize);
        
        // Build storage key for curated level
        this.storageKey = `curated-${this.levelId}`;
        this.bestSolutionKey = buildBestSolutionKey(this.storageKey);
        
        const storedState =
          useStored && this.storageKey ? loadPersistedState(this.storageKey) : null;
        
        if (storedState) {
          this.cubes = storedState.cubes;
          this.goals = storedState.goals;
          this.moveHistory = storedState.moveHistory;
        } else {
          // Convert level data to game state with validation
          try {
            this.cubes = levelData.cubes.map(cube => {
              if (!isValidFaceOrientation(cube.orientation)) {
                throw new Error(`Invalid orientation: ${cube.orientation}`);
              }
              return {
                id: cube.id,
                position: cube.position,
                orientation: cube.orientation,
              };
            });
            this.goals = levelData.goals.map(goal => {
              if (!isValidFaceColor(goal.color)) {
                throw new Error(`Invalid goal color: ${goal.color}`);
              }
              return {
                position: goal.position,
                color: goal.color,
              };
            });
            this.moveHistory = [];
          } catch (error) {
            console.error(`Invalid level data for ${this.levelId}:`, error);
            this.fallbackToProceduralGeneration();
            // Continue with procedural generation below
          }
        }
        
        // Only complete curated level loading if we didn't fall back
        if (this.levelId) {
          this.bestSolution = this.bestSolutionKey
            ? loadBestSolution(this.bestSolutionKey)
            : null;
          this.resetDragState();
          this.persistState();
          
          ensureUrlParams(this.gridSize, this.count, this.seedValue, this.levelId);
          return;
        }
      }
    }
    
    // Procedural generation mode (or fallback from failed curated level)
    this.ensureCountWithinUnlockedRange();
    this.currentLevelData = null;
    this.storageKey = buildStorageKey(
      this.gridSize,
      this.count,
      this.seedValue
    );
    this.bestSolutionKey = this.storageKey
      ? buildBestSolutionKey(this.storageKey)
      : null;
    const storedState =
      useStored && this.storageKey ? loadPersistedState(this.storageKey) : null;
    if (storedState) {
      this.cubes = storedState.cubes;
      this.goals = storedState.goals;
      this.moveHistory = storedState.moveHistory;
    } else {
      const level = generateLevel(this.gridSize, this.count, this.seed);
      this.cubes = level.cubes;
      this.goals = level.goals;
      this.moveHistory = [];
    }
    this.bestSolution = this.bestSolutionKey
      ? loadBestSolution(this.bestSolutionKey)
      : null;
    this.resetDragState();
    this.persistState();
  }

  private getCubeWorldCenter(position: CubePosition) {
    const halfSize = GRID_SPACING / 2;
    const gridRadius = getGridRadius();
    const cellCenterX =
      -gridRadius + GRID_SPACING / 2 + position.x * GRID_SPACING;
    const cellCenterY =
      -gridRadius + GRID_SPACING / 2 + position.y * GRID_SPACING;
    return { x: cellCenterX, y: cellCenterY, z: halfSize };
  }

  private projectWorldPoint(point: { x: number; y: number; z: number }) {
    if (typeof (this.p as any).screenPosition === "function") {
      const projected = (this.p as any).screenPosition(
        point.x,
        point.y,
        point.z
      );
      if (projected) {
        return { x: projected.x, y: projected.y };
      }
    }
    return {
      x: this.p.width / 2 + point.x,
      y: this.p.height / 2 + point.y,
    };
  }

  private findCubeUnderPointer(): CubeState | null {
    let closestCube: CubeState | null = null;
    let closestDistance = CUBE_PICK_RADIUS;

    this.cubes.forEach((cube) => {
      const center = this.getCubeWorldCenter(cube.position);
      const screenPosition = this.projectWorldPoint(center);
      const dist = Math.hypot(
        this.p.mouseX - screenPosition.x,
        this.p.mouseY - screenPosition.y
      );
      if (dist <= closestDistance) {
        closestDistance = dist;
        closestCube = cube;
      }
    });

    return closestCube;
  }

  private getCubeById(id: number | null) {
    if (id === null) return null;
    return this.cubes.find((cube) => cube.id === id) ?? null;
  }

  private removeOppositeHistoryEntry(
    cubeId: number,
    direction: Direction
  ): HistoryRemoval | null {
    const lastIndex = this.moveHistory.length - 1;
    if (lastIndex < 0) {
      return null;
    }
    const entry = this.moveHistory[lastIndex];
    if (entry.cubeId !== cubeId) {
      return null;
    }
    if (oppositeDirection[entry.direction] === direction) {
      this.moveHistory.pop();
      return { entry, index: lastIndex };
    }
    return null;
  }

  private clearPersistedState() {
    if (!this.storageKey) {
      return;
    }
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }
    window.localStorage.removeItem(this.storageKey);
  }

  private persistState() {
    if (!this.storageKey) {
      return;
    }
    savePersistedState(this.storageKey, {
      cubes: this.cubes,
      goals: this.goals,
      moveHistory: this.moveHistory,
    });
  }

  private getPrimaryColorFromOrientation(orientation: FaceOrientationKey) {
    return orientation.split(":")[0] as FaceColorName;
  }

  private checkGoalsComplete() {
    return this.goals.every((goal) =>
      this.cubes.some((cube) => {
        const matchesPosition =
          cube.position.x === goal.position.x &&
          cube.position.y === goal.position.y;
        if (!matchesPosition) {
          return false;
        }
        const primaryColor = this.getPrimaryColorFromOrientation(cube.orientation);
        return primaryColor === goal.color;
      })
    );
  }

  private tryUpdateBestSolution() {
    if (!this.storageKey || !this.bestSolutionKey) {
      return;
    }
    if (!this.checkGoalsComplete()) {
      return;
    }
    const key = this.bestSolutionKey;
    playLevelCompleteSound();
    const candidate: BestSolution = {
      completedAt: Date.now(),
      moveHistory: [...this.moveHistory],
    };
    const currentBest = this.bestSolution;
    if (!currentBest || candidate.moveHistory.length < currentBest.moveHistory.length) {
      this.bestSolution = candidate;
      saveBestSolution(key, candidate);
    }
  }

  public async resetLevel() {
    this.clearPersistedState();
    await this.loadLevelState(false);
  }

  public async nextLevel() {
    if (this.levelId) {
      // Navigate to next curated level
      const levelIds = getLevelIds();
      const currentIndex = levelIds.indexOf(this.levelId);
      if (currentIndex >= 0 && currentIndex < levelIds.length - 1) {
        this.levelId = levelIds[currentIndex + 1];
        await this.loadLevelState();
      }
      return;
    }
    
    // Procedural generation mode
    const maxCells = this.gridSize * this.gridSize;
    const unlockedLimit = getUnlockedLevelLimitFor(this.gridSize, this.seedValue);
    if (this.count >= maxCells || this.count >= unlockedLimit) {
      return;
    }
    this.count = Math.min(maxCells, unlockedLimit, this.count + 1);
    ensureUrlParams(this.gridSize, this.count, this.seedValue, null);
    await this.loadLevelState();
  }

  public async previousLevel() {
    if (this.levelId) {
      // Navigate to previous curated level
      const levelIds = getLevelIds();
      const currentIndex = levelIds.indexOf(this.levelId);
      if (currentIndex > 0) {
        this.levelId = levelIds[currentIndex - 1];
        await this.loadLevelState();
      }
      return;
    }
    
    // Procedural generation mode
    if (this.count <= 1) {
      return;
    }
    this.count = Math.max(1, this.count - 1);
    ensureUrlParams(this.gridSize, this.count, this.seedValue, null);
    await this.loadLevelState();
  }

  public hasBestSolution() {
    return this.bestSolution !== null;
  }

  private applyMoveWithoutAnimation(entry: MoveHistoryEntry) {
    const cube = this.cubes.find((c) => c.id === entry.cubeId);
    if (!cube) {
      return false;
    }
    const targetOrientation =
      DIRECTIONAL_ORIENTATION_MAPS[entry.direction][cube.orientation];
    if (!targetOrientation) {
      return false;
    }
    const [offsetX, offsetY] = directionOffsets[entry.direction];
    cube.position = {
      x: cube.position.x + offsetX,
      y: cube.position.y + offsetY,
    };
    cube.orientation = targetOrientation;
    return true;
  }

  public async loadBestSolutionHistory() {
    const solution = this.bestSolution;
    if (!solution) {
      return false;
    }
    await this.loadLevelState(false);
    this.moveHistory = [];
    for (const entry of solution.moveHistory) {
      this.applyMoveWithoutAnimation(entry);
      this.moveHistory.push(entry);
    }
    this.persistState();
    return true;
  }

  public async goToSeed(newSeed: string) {
    const safeSeedValue = sanitizeSeedValue(newSeed);
    if (safeSeedValue === this.seedValue) {
      return false;
    }
    // Switch to procedural mode when changing seed
    this.levelId = null;
    this.currentLevelData = null;
    this.seedValue = safeSeedValue;
    this.seed = hashSeedString(this.seedValue);
    ensureUrlParams(this.gridSize, this.count, this.seedValue, null);
    await this.loadLevelState();
    return true;
  }

  public canAdvanceLevel() {
    if (this.levelId) {
      const levelIds = getLevelIds();
      const currentIndex = levelIds.indexOf(this.levelId);
      return currentIndex >= 0 && currentIndex < levelIds.length - 1;
    }
    const unlockedLimit = getUnlockedLevelLimitFor(this.gridSize, this.seedValue);
    return this.count < unlockedLimit;
  }

  public canGoBack() {
    if (this.levelId) {
      const levelIds = getLevelIds();
      const currentIndex = levelIds.indexOf(this.levelId);
      return currentIndex > 0;
    }
    return this.count > 1;
  }

  private isInsideGrid(position: CubePosition) {
    const gridCells = getGridCells();
    return (
      position.x >= 0 &&
      position.x < gridCells &&
      position.y >= 0 &&
      position.y < gridCells
    );
  }

  private isCellOccupied(position: CubePosition, ignoreId: number | null = null) {
    return this.cubes.some(
      (cube) =>
        cube.id !== ignoreId &&
        cube.position.x === position.x &&
        cube.position.y === position.y
    );
  }

  private scheduleMove(
    cube: CubeState,
    direction: Direction,
    {
      recordHistory = true,
      skipOppositeCheck = false,
    }: MoveOptions = {}
  ): boolean {
    if (!skipOppositeCheck) {
      const removal = this.removeOppositeHistoryEntry(cube.id, direction);
      if (removal) {
        const success = this.scheduleMove(cube, direction, {
          recordHistory: false,
          skipOppositeCheck: true,
        });
        if (!success) {
          this.moveHistory.splice(removal.index, 0, removal.entry);
        }
        return success;
      }
    }

    if (this.animationState) return false;
    const [offsetX, offsetY] = directionOffsets[direction];
    const targetPosition: CubePosition = {
      x: cube.position.x + offsetX,
      y: cube.position.y + offsetY,
    };
    if (!this.isInsideGrid(targetPosition)) {
      playBlockedSound();
      return false;
    }
    if (this.isCellOccupied(targetPosition, cube.id)) {
      playBlockedSound();
      return false;
    }

    const targetOrientation =
      DIRECTIONAL_ORIENTATION_MAPS[direction][cube.orientation];
    if (!targetOrientation) {
      playBlockedSound();
      return false;
    }

    this.animationState = {
      cubeId: cube.id,
      startTime: this.p.millis(),
      duration: ANIMATION_DURATION_MS,
      fromPosition: { ...cube.position },
      toPosition: targetPosition,
      fromOrientation: cube.orientation,
      toOrientation: targetOrientation,
    };

    if (recordHistory) {
      this.moveHistory.push({ cubeId: cube.id, direction });
    }
    playMoveSound();
    return true;
  }

  private startDrag() {
    if (this.animationState) return;
    const pickedCube = this.findCubeUnderPointer();
    if (!pickedCube) return;
    this.dragTargetId = pickedCube.id;
    this.dragState.active = true;
    this.dragState.startX = this.p.mouseX;
    this.dragState.startY = this.p.mouseY;
    this.dragState.currentX = this.p.mouseX;
    this.dragState.currentY = this.p.mouseY;
  }

  private stopDrag() {
    this.dragState.active = false;
    this.dragTargetId = null;
  }

  private triggerMove() {
    if (this.animationState || this.dragTargetId === null) return;

    const targetCube = this.getCubeById(this.dragTargetId);
    if (!targetCube) return;

    const dx = this.dragState.currentX - this.dragState.startX;
    const dy = this.dragState.currentY - this.dragState.startY;
    const distance = Math.hypot(dx, dy);
    if (distance < DRAG_DISTANCE_THRESHOLD) return;

    const direction: Direction =
      Math.abs(dx) >= Math.abs(dy)
        ? dx > 0
          ? "east"
          : "west"
        : dy > 0
        ? "south"
        : "north";

    if (this.scheduleMove(targetCube, direction)) {
      this.dragTargetId = null;
    }
  }

  private getAnimatedCubeRender(): AnimatedCubeRender | null {
    const currentAnimation = this.animationState;
    if (!currentAnimation) return null;

    const elapsed = Math.min(
      Math.max(this.p.millis() - currentAnimation.startTime, 0),
      currentAnimation.duration
    );
    const rawProgress = elapsed / currentAnimation.duration;
    const easedProgress = easeOutCubic(rawProgress);

    if (rawProgress >= 1) {
      const animatedCube = this.cubes.find(
        (cube) => cube.id === currentAnimation.cubeId
      );
      if (animatedCube) {
        animatedCube.position = { ...currentAnimation.toPosition };
        animatedCube.orientation = currentAnimation.toOrientation;
      }
      this.animationState = null;
      this.persistState();
      this.tryUpdateBestSolution();
      return null;
    }

    const position = {
      x: this.p.lerp(
        currentAnimation.fromPosition.x,
        currentAnimation.toPosition.x,
        easedProgress
      ),
      y: this.p.lerp(
        currentAnimation.fromPosition.y,
        currentAnimation.toPosition.y,
        easedProgress
      ),
    };

    const rotation = quaternionSlerp(
      ORIENTATION_QUATERNIONS[currentAnimation.fromOrientation],
      ORIENTATION_QUATERNIONS[currentAnimation.toOrientation],
      easedProgress
    );

    return {
      cubeId: currentAnimation.cubeId,
      position,
      rotation,
    };
  }

  public drawCubes() {
    this.drawGoals();
    const activeCubeRender = this.getAnimatedCubeRender();

    this.cubes.forEach((cube) => {
      const render =
        activeCubeRender && activeCubeRender.cubeId === cube.id
          ? activeCubeRender
          : {
              position: cube.position,
              rotation: ORIENTATION_QUATERNIONS[cube.orientation],
            };
      drawCube(this.p, render.position.x, render.position.y, render.rotation);
    });
  }

  private drawGoals() {
    this.goals.forEach((goal) => {
      drawFloor(this.p, goal.position.x, goal.position.y, goal.color);
      this.drawGoalOverlay(goal);
    });
  }

  private drawGoalOverlay(goal: Goal) {
    const halfSpacing = GRID_SPACING / 2;
    const radius = getGridRadius();
    const cellCenterX =
      -radius + halfSpacing + goal.position.x * GRID_SPACING;
    const cellCenterY =
      -radius + halfSpacing + goal.position.y * GRID_SPACING;

    this.p.push();
    this.p.noStroke();
    this.p.fill(0, 150);
    this.p.ellipse(cellCenterX, cellCenterY, GRID_SPACING * 0.3);
    this.p.pop();
  }

  public handleMousePressed() {
    unlockAudioContext();
    this.startDrag();
  }

  public handleMouseDragged() {
    if (!this.dragState.active) return;
    this.dragState.currentX = this.p.mouseX;
    this.dragState.currentY = this.p.mouseY;
  }

  public handleMouseReleased() {
    if (!this.dragState.active) return;
    this.triggerMove();
    this.stopDrag();
  }

  public getDragState() {
    return this.dragState;
  }

  public isAnimating() {
    return this.animationState !== null;
  }

  public getMoveHistory() {
    return [...this.moveHistory];
  }

  public getGridSize() {
    return this.gridSize;
  }

  public getSeedValue() {
    return this.seedValue;
  }

  public moveOppositeOfLastEntry() {
    if (this.animationState) return false;
    const entry = this.moveHistory[this.moveHistory.length - 1];
    if (!entry) return false;
    const cube = this.cubes.find((c) => c.id === entry.cubeId);
    if (!cube) return false;
    const backwards = oppositeDirection[entry.direction];
    return this.scheduleMove(cube, backwards);
  }

  public getMoveCount() {
    return this.moveHistory.length;
  }

  public isCurrentHistoryBestSolution() {
    if (!this.bestSolution) {
      return false;
    }
    const solutionMoves = this.bestSolution.moveHistory;
    if (solutionMoves.length !== this.moveHistory.length) {
      return false;
    }
    for (let i = 0; i < solutionMoves.length; i += 1) {
      const solution = solutionMoves[i];
      const current = this.moveHistory[i];
      if (
        solution.cubeId !== current.cubeId ||
        solution.direction !== current.direction
      ) {
        return false;
      }
    }
    return true;
  }
  
  public getCurrentLevelInfo() {
    if (this.levelId && this.currentLevelData) {
      return {
        isCurated: true,
        levelId: this.levelId,
        name: this.currentLevelData.name,
        description: this.currentLevelData.description,
        difficulty: this.currentLevelData.difficulty,
        parMoves: this.currentLevelData.parMoves,
        author: this.currentLevelData.author,
      };
    }
    return {
      isCurated: false,
      levelId: null,
      gridSize: this.gridSize,
      count: this.count,
      seedValue: this.seedValue,
    };
  }
  
  public async switchToCuratedLevel(levelId: string) {
    this.levelId = levelId;
    await this.loadLevelState();
  }
  
  public async switchToProceduralMode() {
    this.levelId = null;
    this.currentLevelData = null;
    ensureUrlParams(this.gridSize, this.count, this.seedValue, null);
    await this.loadLevelState();
  }
}
