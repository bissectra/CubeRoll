import "./style.css";
import p5 from "p5";
import { MovementManager, type DragState } from "./movement";
import { drawGrid, drawOverlay } from "./details";

const sketch = (p: p5) => {
  const movement = new MovementManager(p);

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
  movement.drawCubes();
  drawGrid(p);
  p.pop();

  drawOverlay(p, movement.getDragState(), movement.isAnimating());
  };

  p.mousePressed = () => movement.handleMousePressed();
  p.mouseDragged = () => movement.handleMouseDragged();
  p.mouseReleased = () => movement.handleMouseReleased();
  p.keyPressed = () => {
    if (p.key.toLowerCase() === "u") {
      movement.undoLastMove();
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);
