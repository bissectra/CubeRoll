import "./style.css";
import p5 from "p5";
import { MovementManager, type DragState } from "./movement";
import { drawGrid, drawOverlay } from "./details";
import { setupAudioUnlock } from "./sounds";

const statusPanel = document.createElement("div");
statusPanel.className = "status-panel";
document.body.appendChild(statusPanel);

setupAudioUnlock();

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

    drawOverlay(p, movement.getDragState());

    const statusLine = movement.isAnimating() ? "Rolling..." : "Drag a cube";
    const moveLine = `Moves: ${movement.getMoveCount()}`;
    statusPanel.innerHTML = `<span>${statusLine}</span><span>${moveLine}</span>`;
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
