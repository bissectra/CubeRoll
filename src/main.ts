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
  const controlPanel = document.createElement("div");
  controlPanel.className = "control-panel";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset level";
  resetButton.addEventListener("click", () => movement.resetLevel());
  const nextLevelButton = document.createElement("button");
  nextLevelButton.type = "button";
  nextLevelButton.textContent = "Next level →";
  nextLevelButton.addEventListener("click", () => movement.nextLevel());
  controlPanel.appendChild(resetButton);
  controlPanel.appendChild(nextLevelButton);
  document.body.appendChild(controlPanel);

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
    nextLevelButton.style.display =
      movement.hasBestSolution() && movement.canAdvanceLevel()
        ? "inline-flex"
        : "none";
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
