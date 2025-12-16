import "./style.css";
import p5 from "p5";
import {
  drawCube,
  drawFloor,
  FaceColorName,
  GRID_HALF_COUNT,
  GRID_RADIUS,
  GRID_SPACING,
  ORIENTATION_QUATERNIONS,
} from "./cube-factory";
import { quaternionSlerp } from "./quaternions";

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    canvas.parent("app");
    p.angleMode(p.DEGREES);
    p.setAttributes("antialias", true);
  };

  const floorColorRows: FaceColorName[][] = [
    ["red", "red", "red", "red"],
    ["orange", "orange", "orange", "orange"],
    ["green", "green", "green", "green"],
    ["blue", "blue", "blue", "blue"],
    ["white", "white", "white", "white"],
    ["yellow", "yellow", "yellow", "yellow"],
  ];
  const cubePath = {
    start: { x: 1, y: 1 },
    end: { x: 2, y: 1 },
  };
  const animationDuration = 240;
  let animationFrame = 0;
  const startOrientation = ORIENTATION_QUATERNIONS["white:blue"];
  const endOrientation = ORIENTATION_QUATERNIONS["red:blue"];

  p.draw = () => {
    p.background(16);
    p.lights();
    p.push();

    floorColorRows.forEach((row, rowIndex) => {
      row.forEach((color, colIndex) => {
        const xIndex = colIndex * 2;
        const yIndex = rowIndex * 2;
        drawFloor(p, xIndex, yIndex, color);
      });
    });

    const progress =
      (animationFrame % animationDuration) / animationDuration;
    const easedProgress = (1 - Math.cos(Math.PI * progress)) / 2;
    const currentX =
      cubePath.start.x + (cubePath.end.x - cubePath.start.x) * easedProgress;
    const currentY =
      cubePath.start.y + (cubePath.end.y - cubePath.start.y) * easedProgress;
    const currentOrientation = quaternionSlerp(
      startOrientation,
      endOrientation,
      easedProgress
    );
    drawCube(p, currentX, currentY, currentOrientation);
    animationFrame += 1;

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
