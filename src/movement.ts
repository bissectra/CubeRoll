import p5 from "p5";
import {
  drawCube,
  DIRECTIONAL_ORIENTATION_MAPS,
  ORIENTATION_QUATERNIONS,
  Direction,
  FaceOrientationKey,
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

const DRAG_DISTANCE_THRESHOLD = 18;
const ANIMATION_DURATION_MS = 220;
const CUBE_PICK_RADIUS = GRID_SPACING * 0.6;
const FACE_ORIENTATION_KEYS = Object.keys(
  ORIENTATION_QUATERNIONS
) as FaceOrientationKey[];
const DEFAULT_INITIAL_CUBE_COUNT = 1;
const DEFAULT_SEED_VALUE = "default";

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

const ensureUrlParams = (gridSize: number, countParam: number, seedValue: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const currentParams = new URLSearchParams(url.search);

  const orderedParams = new URLSearchParams();
  orderedParams.set("m", String(gridSize));
  orderedParams.set("n", String(countParam));
  orderedParams.set("seed", seedValue);

  currentParams.forEach((value, key) => {
    if (["m", "n", "seed"].includes(key)) return;
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
  const requestedGrid = parseNumberParam(
    params.get("m"),
    getDefaultGridSize()
  );
  const validGridSizes = getGridSizeOptions();
  const safeGrid = validGridSizes.includes(requestedGrid)
    ? requestedGrid
    : getDefaultGridSize();
  setGridCells(safeGrid);

  const requestedCount = parseNumberParam(params.get("n"), DEFAULT_INITIAL_CUBE_COUNT);
  const safeCount = Math.min(
    getGridCells() * getGridCells(),
    Math.max(0, requestedCount)
  );
  const requestedSeedValue = params.get("seed") ?? DEFAULT_SEED_VALUE;

  ensureUrlParams(safeGrid, safeCount, requestedSeedValue);

  return {
    count: safeCount,
    seed: hashSeedString(requestedSeedValue),
  };
};

const directionOffsets: Record<Direction, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
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

const generateInitialCubes = (count: number, seed: number): CubeState[] => {
  const cubes: CubeState[] = [];
  const usedPositions = new Set<string>();
  let attempts = 0;
  const rng = mulberry32(seed);
  const maxCount = getGridCells() * getGridCells();
  const targetCount = Math.min(count, maxCount);

  if (targetCount <= 0) {
    return [];
  }

  while (cubes.length < targetCount && attempts < 400) {
    attempts++;
    const position: CubePosition = {
      x: Math.floor(rng() * getGridCells()),
      y: Math.floor(rng() * getGridCells()),
    };
    const key = `${position.x},${position.y}`;
    if (usedPositions.has(key)) continue;
    usedPositions.add(key);
    const orientation =
      FACE_ORIENTATION_KEYS[
        Math.floor(rng() * FACE_ORIENTATION_KEYS.length)
      ];
    cubes.push({
      id: cubes.length + 1,
      position,
      orientation,
    });
  }

  return cubes;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export class MovementManager {
  private cubes: CubeState[];
  private animationState: AnimationState | null = null;
  private dragTargetId: number | null = null;
  private dragState: DragState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  };
  private worldToScreen:
    | ((vector: p5.Vector) => p5.Vector)
    | undefined = undefined;

  constructor(private readonly p: p5) {
    this.worldToScreen = (p as any).worldToScreen?.bind(p);
    const { count, seed } = getInitialParams();
    this.cubes = generateInitialCubes(count, seed);
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
    if (this.worldToScreen) {
      const projected = this.worldToScreen(
        this.p.createVector(point.x, point.y, point.z)
      );
      return { x: projected.x, y: projected.y };
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

    const [offsetX, offsetY] = directionOffsets[direction];
    const targetPosition: CubePosition = {
      x: targetCube.position.x + offsetX,
      y: targetCube.position.y + offsetY,
    };

    if (!this.isInsideGrid(targetPosition)) return;
    if (this.isCellOccupied(targetPosition, targetCube.id)) return;

    const targetOrientation =
      DIRECTIONAL_ORIENTATION_MAPS[direction][targetCube.orientation];
    if (!targetOrientation) return;

    this.animationState = {
      cubeId: targetCube.id,
      startTime: this.p.millis(),
      duration: ANIMATION_DURATION_MS,
      fromPosition: { ...targetCube.position },
      toPosition: targetPosition,
      fromOrientation: targetCube.orientation,
      toOrientation: targetOrientation,
    };

    this.dragTargetId = null;
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

  public handleMousePressed() {
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
}
