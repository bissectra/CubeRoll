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
  const createControlLabel = (text: string) => {
    const span = document.createElement("span");
    span.className = "control-label";
    span.textContent = text;
    return span;
  };

  const createIcon = (iconClass: string) => {
    const icon = document.createElement("i");
    icon.className = `${iconClass} control-icon`;
    icon.setAttribute("aria-hidden", "true");
    return icon;
  };

  const createControlButton = (
    text: string,
    onClick: () => void,
    iconClass: string
  ) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", text);
    button.appendChild(createIcon(iconClass));
    button.appendChild(createControlLabel(text));
    button.addEventListener("click", onClick);
    return button;
  };

  const resetButton = createControlButton(
    "Reset level",
    () => movement.resetLevel(),
    "fa-solid fa-rotate-right"
  );
  const previousLevelButton = createControlButton(
    "Previous level",
    () => movement.previousLevel(),
    "fa-solid fa-chevron-left"
  );
  const nextLevelButton = createControlButton(
    "Next level",
    () => movement.nextLevel(),
    "fa-solid fa-chevron-right"
  );

  const statsLink = document.createElement("a");
  statsLink.className = "stats-link";
  statsLink.setAttribute("aria-label", "Stats");
  statsLink.setAttribute("role", "button");
  statsLink.appendChild(createIcon("fa-solid fa-chart-line"));
  statsLink.appendChild(createControlLabel("Stats"));

  controlPanel.appendChild(resetButton);
  controlPanel.appendChild(previousLevelButton);
  controlPanel.appendChild(nextLevelButton);
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
