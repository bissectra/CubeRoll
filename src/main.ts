import "./style.css";
import p5 from "p5";
import {
  drawCube,
  GRID_CELLS,
  GRID_HALF_COUNT,
  GRID_RADIUS,
  GRID_SPACING,
  ORIENTATION_QUATERNIONS,
  DIRECTIONAL_ORIENTATION_MAPS,
  FaceOrientationKey,
} from "./cube-factory";
import { quaternionSlerp } from "./quaternions";

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    canvas.parent("app");
    p.angleMode(p.DEGREES);
    p.setAttributes("antialias", true);
  };

  const westEntries = Object.entries(
    DIRECTIONAL_ORIENTATION_MAPS.west
  ) as [FaceOrientationKey, FaceOrientationKey][];
  const animationDuration = 240;
  const evenXIndices: number[] = [];
  for (let xIndex = 0; xIndex < GRID_CELLS - 1; xIndex += 2) {
    evenXIndices.push(xIndex);
  }
  const evenYIndices: number[] = [];
  for (let yIndex = 0; yIndex < GRID_CELLS; yIndex += 2) {
    evenYIndices.push(yIndex);
  }
  const slots = evenXIndices.flatMap((xIndex) =>
    evenYIndices.map((yIndex) => ({ xIndex, yIndex }))
  );
  const cubeAnimations = westEntries.map(([startKey, endKey], entryIndex) => ({
    slot: slots[entryIndex % slots.length],
    startKey,
    endKey,
  }));
  let animationFrame = 0;

  p.draw = () => {
    p.background(16);
    p.lights();
    p.push();

    const progress = animationFrame / animationDuration;
    const easedProgress = (1 - Math.cos(Math.PI * progress)) / 2;
    cubeAnimations.forEach(({ slot, startKey, endKey }) => {
      const startOrientation = ORIENTATION_QUATERNIONS[startKey];
      const endOrientation = ORIENTATION_QUATERNIONS[endKey];

      const startX = slot.xIndex + 1;
      const currentX = startX - easedProgress;
      const currentY = slot.yIndex;
      const currentOrientation = quaternionSlerp(
        startOrientation,
        endOrientation,
        easedProgress
      );
      drawCube(p, currentX, currentY, currentOrientation);
    });

    animationFrame = (animationFrame + 1) % animationDuration;

    drawGrid(p);
    p.pop();
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
