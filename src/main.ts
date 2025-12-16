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
  const previousLevelButton = document.createElement("button");
  previousLevelButton.type = "button";
  previousLevelButton.textContent = "← Previous level";
  previousLevelButton.addEventListener("click", () => movement.previousLevel());
  const nextLevelButton = document.createElement("button");
  nextLevelButton.type = "button";
  nextLevelButton.textContent = "Next level →";
  nextLevelButton.addEventListener("click", () => movement.nextLevel());
  controlPanel.appendChild(resetButton);
  controlPanel.appendChild(previousLevelButton);
  controlPanel.appendChild(nextLevelButton);
  const statsLink = document.createElement("a");
  statsLink.className = "stats-link";
  statsLink.textContent = "Stats";
  statsLink.setAttribute("role", "button");
  controlPanel.appendChild(statsLink);
  document.body.appendChild(controlPanel);

  const updateStatsLink = () => {
    const params = new URLSearchParams();
    params.set("m", String(movement.getGridSize()));
    params.set("seed", movement.getSeedValue());
    statsLink.href = `stats.html?${params.toString()}`;
  };
  updateStatsLink();

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
    const canAdvance =
      movement.hasBestSolution() && movement.canAdvanceLevel();
    nextLevelButton.disabled = !canAdvance;
    previousLevelButton.disabled = !movement.canGoBack();
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
