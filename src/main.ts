import "./style.css";
import p5 from "p5";
import {
  drawFloor,
  FaceColorName,
  GRID_RADIUS,
  GRID_SPACING,
  GRID_HALF_COUNT,
} from "./cube-factory";

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
