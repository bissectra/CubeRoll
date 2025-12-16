import "./style.css";
import p5 from "p5";
import {
  drawCube,
  GRID_HALF_COUNT,
  GRID_RADIUS,
  GRID_SPACING,
  GRID_CELLS,
  ORIENTATION_QUATERNIONS,
  DIRECTIONAL_ORIENTATION_MAPS,
  Direction,
  FaceOrientationKey,
} from "./cube-factory";
import { quaternionSlerp } from "./quaternions";

const DRAG_DISTANCE_THRESHOLD = 18;
const ANIMATION_DURATION_MS = 380;
const centerIndex = Math.floor(GRID_CELLS / 2);

const directionOffsets: Record<Direction, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

type CubePosition = { x: number; y: number };
type DragState = {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};
type AnimationState = {
  startTime: number;
  duration: number;
  fromPosition: CubePosition;
  toPosition: CubePosition;
  fromOrientation: FaceOrientationKey;
  toOrientation: FaceOrientationKey;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const sketch = (p: p5) => {
  let cubePosition: CubePosition = { x: centerIndex, y: centerIndex };
  let cubeOrientationKey: FaceOrientationKey = "white:green";
  let animationState: AnimationState | null = null;
  const dragState: DragState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  };

  const startDrag = () => {
    if (animationState) return;
    dragState.active = true;
    dragState.startX = p.mouseX;
    dragState.startY = p.mouseY;
    dragState.currentX = p.mouseX;
    dragState.currentY = p.mouseY;
  };

  const stopDrag = () => {
    dragState.active = false;
  };

  const isInsideGrid = (position: CubePosition) =>
    position.x >= 0 &&
    position.x < GRID_CELLS &&
    position.y >= 0 &&
    position.y < GRID_CELLS;

  const triggerMove = () => {
    if (animationState) return;

    const dx = dragState.currentX - dragState.startX;
    const dy = dragState.currentY - dragState.startY;
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
      x: cubePosition.x + offsetX,
      y: cubePosition.y + offsetY,
    };

    if (!isInsideGrid(targetPosition)) return;

    const targetOrientation =
      DIRECTIONAL_ORIENTATION_MAPS[direction][cubeOrientationKey];

    if (!targetOrientation) return;

    animationState = {
      startTime: p.millis(),
      duration: ANIMATION_DURATION_MS,
      fromPosition: { ...cubePosition },
      toPosition: targetPosition,
      fromOrientation: cubeOrientationKey,
      toOrientation: targetOrientation,
    };
  };

  const getRenderState = () => {
    if (!animationState) {
      return {
        position: cubePosition,
        rotation: ORIENTATION_QUATERNIONS[cubeOrientationKey],
      };
    }

    const elapsed = Math.min(
      Math.max(p.millis() - animationState.startTime, 0),
      animationState.duration
    );
    const rawProgress = elapsed / animationState.duration;
    const easedProgress = easeOutCubic(rawProgress);

    if (rawProgress >= 1) {
      cubePosition = { ...animationState.toPosition };
      cubeOrientationKey = animationState.toOrientation;
      animationState = null;
      return {
        position: cubePosition,
        rotation: ORIENTATION_QUATERNIONS[cubeOrientationKey],
      };
    }

    const position = {
      x: p.lerp(
        animationState.fromPosition.x,
        animationState.toPosition.x,
        easedProgress
      ),
      y: p.lerp(
        animationState.fromPosition.y,
        animationState.toPosition.y,
        easedProgress
      ),
    };

    const rotation = quaternionSlerp(
      ORIENTATION_QUATERNIONS[animationState.fromOrientation],
      ORIENTATION_QUATERNIONS[animationState.toOrientation],
      easedProgress
    );

    return { position, rotation };
  };

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    canvas.parent("app");
    p.angleMode(p.DEGREES);
    p.setAttributes("antialias", true);
  };

  p.draw = () => {
    p.background(16);
    p.lights();

    const { position, rotation } = getRenderState();

    p.push();
    drawCube(p, position.x, position.y, rotation);
    drawGrid(p);
    p.pop();

    drawOverlay(p, dragState, animationState !== null);
  };

  p.mousePressed = () => {
    startDrag();
  };

  p.mouseDragged = () => {
    if (!dragState.active) return;
    dragState.currentX = p.mouseX;
    dragState.currentY = p.mouseY;
  };

  p.mouseReleased = () => {
    if (!dragState.active) return;
    triggerMove();
    stopDrag();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);

function drawGrid(p: p5) {
  p.strokeWeight(1);
  p.stroke(255, 255, 255, 120);
  p.noFill();

  for (let i = -GRID_HALF_COUNT; i <= GRID_HALF_COUNT; i++) {
    const offset = i * GRID_SPACING;
    p.line(offset, -GRID_RADIUS, 0, offset, GRID_RADIUS, 0);
    p.line(-GRID_RADIUS, offset, 0, GRID_RADIUS, offset, 0);
  }
}

function drawOverlay(p: p5, dragState: DragState, isAnimating: boolean) {
  p.push();
  p.resetMatrix();
  p.translate(-p.width / 2, -p.height / 2);

  p.strokeWeight(2);
  p.stroke(255, 200);
  if (dragState.active) {
    p.line(
      dragState.startX,
      dragState.startY,
      dragState.currentX,
      dragState.currentY
    );
    p.fill(255);
    p.circle(dragState.startX, dragState.startY, 8);
    p.circle(dragState.currentX, dragState.currentY, 8);
  }

  p.noStroke();
  p.fill(255);
  p.textSize(14);
  p.textAlign(p.LEFT, p.TOP);
  const statusText = isAnimating
    ? "Rolling..."
    : "Drag the cube along any axis to roll it.";
  p.text(statusText, 20, 20);
  p.pop();
}
