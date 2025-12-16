import p5 from "p5";
import {
  GRID_HALF_COUNT,
  GRID_RADIUS,
  GRID_SPACING,
} from "./cube-factory";
import { DragState } from "./movement";

export function drawGrid(p: p5) {
  p.strokeWeight(1);
  p.stroke(255, 255, 255, 120);
  p.noFill();

  for (let i = -GRID_HALF_COUNT; i <= GRID_HALF_COUNT; i++) {
    const offset = i * GRID_SPACING;
    p.line(offset, -GRID_RADIUS, 0, offset, GRID_RADIUS, 0);
    p.line(-GRID_RADIUS, offset, 0, GRID_RADIUS, offset, 0);
  }
}

export function drawOverlay(
  p: p5,
  dragState: DragState,
  isAnimating: boolean
) {
  p.push();
  const rendererGL = (p as any)._renderer?.GL;
  if (rendererGL) {
    rendererGL.disable(rendererGL.DEPTH_TEST);
  }
  p.resetMatrix();
  p.translate(-p.width / 2, -p.height / 2);

  p.strokeWeight(2);
  p.stroke(255, 200);
  if (dragState.active) {
    p.line(
      dragState.startX,
      dragState.startY,
      dragState.currentX,
      dragState.currentY
    );
    p.fill(255);
    p.circle(dragState.startX, dragState.startY, 8);
    p.circle(dragState.currentX, dragState.currentY, 8);
  }

  p.noStroke();
  p.fill(255);
  p.textSize(14);
  p.textAlign(p.LEFT, p.TOP);
  const statusText = isAnimating
    ? "Rolling..."
    : "Drag the cube along any axis to roll it.";
  p.text(statusText, 20, 20);

  if (rendererGL) {
    rendererGL.enable(rendererGL.DEPTH_TEST);
  }
  p.pop();
}
