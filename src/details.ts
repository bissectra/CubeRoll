import p5 from "p5";
import { GRID_SPACING, getGridHalfCount, getGridRadius } from "./grid-config";
import { DragState } from "./movement";

export function drawGrid(p: p5) {
  p.strokeWeight(1);
  p.stroke(255, 255, 255, 120);
  p.noFill();

  const halfCount = getGridHalfCount();
  const radius = getGridRadius();

  for (let i = -halfCount; i <= halfCount; i++) {
    const offset = i * GRID_SPACING;
    p.line(offset, -radius, 0, offset, radius, 0);
    p.line(-radius, offset, 0, radius, offset, 0);
  }
}

export function drawOverlay(p: p5, dragState: DragState) {
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

  if (rendererGL) {
    rendererGL.enable(rendererGL.DEPTH_TEST);
  }
  p.pop();
}
