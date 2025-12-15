import "./style.css";
import p5 from "p5";

const sketch = (p: p5) => {
  const gridCells = 5; // total number of grid lines per axis (must be odd to center the origin)
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

  const drawFloorCell = (
    xIndex: number,
    yIndex: number,
    colorValue: p5.Color
  ) => {
    const cellCenterX = -gridRadius + gridSpacing / 2 + xIndex * gridSpacing;
    const cellCenterY = -gridRadius + gridSpacing / 2 + yIndex * gridSpacing;
    p.push();
    p.translate(cellCenterX, cellCenterY, 0);
    p.fill(colorValue);
    p.noStroke();
    p.plane(gridSpacing, gridSpacing);
    p.pop();
  };

  const drawCube = (
    xIndex: number,
    yIndex: number,
    zAxis: number,
    zDir: number,
    xAxis: number,
    xDir: number,
    pallette: p5.Color[][]
  ) => {
    const cellCenterX = -gridRadius + gridSpacing / 2 + xIndex * gridSpacing;
    const cellCenterY = -gridRadius + gridSpacing / 2 + yIndex * gridSpacing;
    const cubeSize = gridSpacing;
    const halfSize = cubeSize / 2;
    const center = p.createVector(cellCenterX, cellCenterY, halfSize);

    const axisDirections = [
      p.createVector(1, 0, 0),
      p.createVector(0, 1, 0),
      p.createVector(0, 0, 1),
    ];
    const directionSign = (value: number) => (value === 1 ? -1 : 1); // palette index 0 = +, 1 = - per axis
    const axisZDir = axisDirections[zAxis].copy().mult(directionSign(zDir));
    const axisXGuess = axisDirections[xAxis].copy().mult(directionSign(xDir));

    let axisYDir = axisZDir.copy().cross(axisXGuess);
    if (axisYDir.magSq() < 1e-6) {
      axisYDir = axisZDir.copy().cross(p.createVector(1, 0, 0));
    }
    if (axisYDir.magSq() < 1e-6) {
      axisYDir = axisZDir.copy().cross(p.createVector(0, 1, 0));
    }
    axisYDir.normalize();
    const axisXDir = axisYDir.copy().cross(axisZDir).normalize();
    const scaledX = axisXDir.copy().mult(halfSize);
    const scaledY = axisYDir.copy().mult(halfSize);
    const scaledZ = axisZDir.copy().mult(halfSize);

    const vertex = (sx: number, sy: number, sz: number) => ({
      x: center.x + scaledX.x * sx + scaledY.x * sy + scaledZ.x * sz,
      y: center.y + scaledX.y * sx + scaledY.y * sy + scaledZ.y * sz,
      z: center.z + scaledX.z * sx + scaledY.z * sy + scaledZ.z * sz,
    });

    const drawFace = (face: { x: number; y: number; z: number }[], colorValue: p5.Color) => {
      p.fill(colorValue);
      p.noStroke();
      p.beginShape();
      face.forEach((vertexPoint) => p.vertex(vertexPoint.x, vertexPoint.y, vertexPoint.z));
      p.endShape(p.CLOSE);
    };

    drawFace(
      [vertex(1, 1, 1), vertex(1, 1, -1), vertex(1, -1, -1), vertex(1, -1, 1)],
      pallette[0][0]
    );
    drawFace(
      [vertex(-1, 1, 1), vertex(-1, -1, 1), vertex(-1, -1, -1), vertex(-1, 1, -1)],
      pallette[0][1]
    );
    drawFace(
      [vertex(1, 1, 1), vertex(1, 1, -1), vertex(-1, 1, -1), vertex(-1, 1, 1)],
      pallette[1][0]
    );
    drawFace(
      [vertex(1, -1, 1), vertex(-1, -1, 1), vertex(-1, -1, -1), vertex(1, -1, -1)],
      pallette[1][1]
    );
    drawFace(
      [vertex(1, 1, 1), vertex(-1, 1, 1), vertex(-1, -1, 1), vertex(1, -1, 1)],
      pallette[2][0]
    );
    drawFace(
      [vertex(1, 1, -1), vertex(1, -1, -1), vertex(-1, -1, -1), vertex(-1, 1, -1)],
      pallette[2][1]
    );
  };

  p.draw = () => {
    const pallette = [
      [p.color(255, 60, 60), p.color(255, 165, 0)],
      [p.color(60, 220, 140), p.color(60, 140, 220)],
      [p.color(240, 240, 250), p.color(255, 240, 60)],
    ];
    
    p.background(16);
    p.lights();

    p.push();
    p.orbitControl();
    drawFloorCell(1, 3, pallette[2][1]);
    drawCube(1, 3, 2, 0, 1, 1, pallette);

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
