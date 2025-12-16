import p5 from "p5";
import {
  drawCube,
  GRID_CELLS,
  GRID_RADIUS,
  GRID_SPACING,
  DIRECTIONAL_ORIENTATION_MAPS,
  ORIENTATION_QUATERNIONS,
  Direction,
  FaceOrientationKey,
} from "./cube-factory";
import { quaternionSlerp, type Quaternion } from "./quaternions";

const DRAG_DISTANCE_THRESHOLD = 18;
const ANIMATION_DURATION_MS = 220;
const CUBE_PICK_RADIUS = GRID_SPACING * 0.6;
const FACE_ORIENTATION_KEYS = Object.keys(
  ORIENTATION_QUATERNIONS
) as FaceOrientationKey[];
const INITIAL_CUBE_COUNT = 3;

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

const generateInitialCubes = (): CubeState[] => {
  const cubes: CubeState[] = [];
  const usedPositions = new Set<string>();
  let attempts = 0;

  while (cubes.length < INITIAL_CUBE_COUNT && attempts < 200) {
    attempts++;
    const position: CubePosition = {
      x: Math.floor(Math.random() * GRID_CELLS),
      y: Math.floor(Math.random() * GRID_CELLS),
    };
    const key = `${position.x},${position.y}`;
    if (usedPositions.has(key)) continue;
    usedPositions.add(key);
    const orientation =
      FACE_ORIENTATION_KEYS[
        Math.floor(Math.random() * FACE_ORIENTATION_KEYS.length)
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
    this.cubes = generateInitialCubes();
  }

  private getCubeWorldCenter(position: CubePosition) {
    const halfSize = GRID_SPACING / 2;
    const cellCenterX =
      -GRID_RADIUS + GRID_SPACING / 2 + position.x * GRID_SPACING;
    const cellCenterY =
      -GRID_RADIUS + GRID_SPACING / 2 + position.y * GRID_SPACING;
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
    return (
      position.x >= 0 &&
      position.x < GRID_CELLS &&
      position.y >= 0 &&
      position.y < GRID_CELLS
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
