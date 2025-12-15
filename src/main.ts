import "./style.css";
import p5 from "p5";
import { drawCube, ORIENTATION_QUATERNIONS } from "./cube-factory";

const sketch = (p: p5) => {
  const gridCells = 11;
  const gridSpacing = 60;
  const gridHalfCount = gridCells / 2;
  const gridRadius = gridHalfCount * gridSpacing;
  const axisLength = gridRadius + gridSpacing;

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    canvas.parent("app");
    p.angleMode(p.DEGREES);
    p.setAttributes("antialias", true);
  };

  p.draw = () => {
    p.background(16);
    p.lights();
    p.push();
    p.orbitControl();

    drawCube(p, 0, 0, ORIENTATION_QUATERNIONS["red:green"], gridSpacing, gridRadius);
    drawCube(p, 2, 0, ORIENTATION_QUATERNIONS["red:blue"], gridSpacing, gridRadius);
    drawCube(p, 4, 0, ORIENTATION_QUATERNIONS["red:white"], gridSpacing, gridRadius);
    drawCube(p, 6, 0, ORIENTATION_QUATERNIONS["red:yellow"], gridSpacing, gridRadius);

    drawCube(p, 0, 2, ORIENTATION_QUATERNIONS["orange:green"], gridSpacing, gridRadius);
    drawCube(p, 2, 2, ORIENTATION_QUATERNIONS["orange:blue"], gridSpacing, gridRadius);
    drawCube(p, 4, 2, ORIENTATION_QUATERNIONS["orange:white"], gridSpacing, gridRadius);
    drawCube(p, 6, 2, ORIENTATION_QUATERNIONS["orange:yellow"], gridSpacing, gridRadius);

    drawCube(p, 0, 4, ORIENTATION_QUATERNIONS["green:red"], gridSpacing, gridRadius);
    drawCube(p, 2, 4, ORIENTATION_QUATERNIONS["green:orange"], gridSpacing, gridRadius);
    drawCube(p, 4, 4, ORIENTATION_QUATERNIONS["green:white"], gridSpacing, gridRadius);
    drawCube(p, 6, 4, ORIENTATION_QUATERNIONS["green:yellow"], gridSpacing, gridRadius);

    drawCube(p, 0, 6, ORIENTATION_QUATERNIONS["blue:red"], gridSpacing, gridRadius);
    drawCube(p, 2, 6, ORIENTATION_QUATERNIONS["blue:orange"], gridSpacing, gridRadius);
    drawCube(p, 4, 6, ORIENTATION_QUATERNIONS["blue:white"], gridSpacing, gridRadius);
    drawCube(p, 6, 6, ORIENTATION_QUATERNIONS["blue:yellow"], gridSpacing, gridRadius);

    drawCube(p, 0, 8, ORIENTATION_QUATERNIONS["white:red"], gridSpacing, gridRadius);
    drawCube(p, 2, 8, ORIENTATION_QUATERNIONS["white:orange"], gridSpacing, gridRadius);
    drawCube(p, 4, 8, ORIENTATION_QUATERNIONS["white:green"], gridSpacing, gridRadius);
    drawCube(p, 6, 8, ORIENTATION_QUATERNIONS["white:blue"], gridSpacing, gridRadius);

    drawCube(p, 0, 10, ORIENTATION_QUATERNIONS["yellow:red"], gridSpacing, gridRadius);
    drawCube(p, 2, 10, ORIENTATION_QUATERNIONS["yellow:orange"], gridSpacing, gridRadius);
    drawCube(p, 4, 10, ORIENTATION_QUATERNIONS["yellow:green"], gridSpacing, gridRadius);
    drawCube(p, 6, 10, ORIENTATION_QUATERNIONS["yellow:blue"], gridSpacing, gridRadius);

    drawGrid(p, gridRadius, gridSpacing, gridHalfCount);
    drawAxes(p, axisLength);
    p.pop();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);

function drawGrid(p: p5, radius: number, spacing: number, halfCount: number) {
  p.strokeWeight(1);
  p.stroke(255, 255, 255, 120);
  p.noFill();

  for (let i = -halfCount; i <= halfCount; i++) {
    const offset = i * spacing;
    p.line(offset, -radius, 0, offset, radius, 0);
    p.line(-radius, offset, 0, radius, offset, 0);
  }
}

function drawAxes(p: p5, length: number) {
  const capDiameter = 12;
  p.strokeWeight(3);

  p.stroke(255, 110, 110);
  p.line(0, 0, 0, length, 0, 0);
  p.push();
  p.translate(length, 0, 0);
  p.noStroke();
  p.fill(255, 110, 110);
  p.sphere(capDiameter);
  p.pop();

  p.stroke(110, 255, 110);
  p.line(0, 0, 0, 0, length, 0);
  p.push();
  p.translate(0, length, 0);
  p.noStroke();
  p.fill(110, 255, 110);
  p.sphere(capDiameter);
  p.pop();

  p.stroke(110, 170, 255);
  p.line(0, 0, 0, 0, 0, length);
  p.push();
  p.translate(0, 0, length);
  p.noStroke();
  p.fill(110, 170, 255);
  p.sphere(capDiameter);
  p.pop();
}
