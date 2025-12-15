import "./style.css";
import p5 from "p5";

const sketch = (p: p5) => {
  const gridSize = 400;
  const gridSpacing = 40;

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
    p.rotateX(-35);
    p.orbitControl();

    drawGrid(p, gridSize, gridSpacing);
    drawAxes(p, gridSize);

    p.pop();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);

function drawGrid(p: p5, size: number, spacing: number) {
  p.strokeWeight(1);
  p.stroke(255, 255, 255, 120);
  p.noFill();

  for (let i = -size; i <= size; i += spacing) {
    p.line(i, -size, 0, i, size, 0);
    p.line(-size, i, 0, size, i, 0);
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
