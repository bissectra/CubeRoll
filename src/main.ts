import "./style.css";
import p5 from "p5";

type FaceColorName = "red" | "orange" | "green" | "blue" | "white" | "yellow";

const FACE_COLOR_VALUES: Record<FaceColorName, [number, number, number]> = {
  red: [255, 60, 60],
  orange: [255, 165, 0],
  green: [60, 220, 140],
  blue: [60, 140, 220],
  white: [240, 240, 250],
  yellow: [255, 240, 60],
};

const getFaceColor = (p: p5, name: FaceColorName) => {
  const [r, g, b] = FACE_COLOR_VALUES[name];
  return p.color(r, g, b);
};

type Quaternion = { w: number; x: number; y: number; z: number };

type FaceOrientationKey = "red:green" | "red:blue" | "red:white" | "red:yellow" |
  "orange:green" | "orange:blue" | "orange:white" | "orange:yellow" |
  "green:red" | "green:orange" | "green:white" | "green:yellow" |
  "blue:red" | "blue:orange" | "blue:white" | "blue:yellow" |
  "white:red" | "white:orange" | "white:green" | "white:blue" |
  "yellow:red" | "yellow:orange" | "yellow:green" | "yellow:blue";

const FACE_COLOR_NAMES = Object.keys(
  FACE_COLOR_VALUES
) as FaceColorName[];

const OPPOSITE_FACE_COLOR: Record<FaceColorName, FaceColorName> = {
  red: "orange",
  orange: "red",
  green: "blue",
  blue: "green",
  white: "yellow",
  yellow: "white",
};

type Vector3 = { x: number; y: number; z: number };

const COLOR_AXIS: Record<FaceColorName, Vector3> = {
  red: { x: 1, y: 0, z: 0 },
  orange: { x: -1, y: 0, z: 0 },
  green: { x: 0, y: 1, z: 0 },
  blue: { x: 0, y: -1, z: 0 },
  white: { x: 0, y: 0, z: 1 },
  yellow: { x: 0, y: 0, z: -1 },
};

const ORIENTATION_QUATERNIONS: Record<FaceOrientationKey, Quaternion> = {
  "green:red": {
    w: 0.5,
    x: 0.5,
    y: 0.5,
    z: 0.5,
  },
  "blue:orange": {
    w: -0.5,
    x: 0.5,
    y: -0.5,
    z: 0.5,
  },
  "red:blue": {
    w: 0,
    x: 0.7071067811865475,
    y: 0,
    z: 0.7071067811865476,
  },
  "orange:green": {
    w: 0.7071067811865476,
    x: 0,
    y: 0.7071067811865475,
    z: 0,
  },
  "blue:red": {
    w: 0.5,
    x: -0.5,
    y: -0.5,
    z: 0.5,
  },
  "green:orange": {
    w: -0.5,
    x: -0.5,
    y: 0.5,
    z: 0.5,
  },
  "red:green": {
    w: 0.7071067811865476,
    x: 0,
    y: -0.7071067811865475,
    z: 0,
  },
  "orange:blue": {
    w: 0,
    x: -0.7071067811865475,
    y: 0,
    z: 0.7071067811865476,
  },
  "blue:white": {
    w: 0.7071067811865476,
    x: -0.7071067811865475,
    y: 0,
    z: 0,
  },
  "green:white": {
    w: 0,
    x: 0,
    y: 0.7071067811865475,
    z: 0.7071067811865476,
  },
  "red:white": {
    w: -0.5,
    x: 0.5,
    y: 0.5,
    z: 0.5,
  },
  "orange:white": {
    w: 0.5,
    x: -0.5,
    y: 0.5,
    z: 0.5,
  },
  "green:yellow": {
    w: 0.7071067811865476,
    x: 0.7071067811865475,
    y: 0,
    z: 0,
  },
  "blue:yellow": {
    w: 0,
    x: 0,
    y: -0.7071067811865475,
    z: 0.7071067811865476,
  },
  "red:yellow": {
    w: 0.5,
    x: 0.5,
    y: -0.5,
    z: 0.5,
  },
  "orange:yellow": {
    w: -0.5,
    x: -0.5,
    y: -0.5,
    z: 0.5,
  },
  "white:green": {
    w: 1,
    x: 0,
    y: 0,
    z: 0,
  },
  "white:blue": {
    w: 0,
    x: 0,
    y: 0,
    z: 1,
  },
  "white:red": {
    w: 0.7071067811865476,
    x: 0,
    y: 0,
    z: 0.7071067811865475,
  },
  "white:orange": {
    w: 0.7071067811865476,
    x: 0,
    y: 0,
    z: -0.7071067811865475,
  },
  "yellow:blue": {
    w: 0,
    x: 1,
    y: 0,
    z: 0,
  },
  "yellow:green": {
    w: 0,
    x: 0,
    y: 1,
    z: 0,
  },
  "yellow:red": {
    w: 0,
    x: 0.7071067811865475,
    y: 0.7071067811865476,
    z: 0,
  },
  "yellow:orange": {
    w: 0,
    x: -0.7071067811865475,
    y: 0.7071067811865476,
    z: 0,
  },
};

const CUBE_SYMMETRY_KEYS = Object.keys(ORIENTATION_QUATERNIONS).sort((a, b) =>
  a.localeCompare(b)
) as FaceOrientationKey[];

const CUBE_SYMMETRY_QUATERNIONS = CUBE_SYMMETRY_KEYS.map(
  (key) => ORIENTATION_QUATERNIONS[key]
);

const quaternionFromAxisAngle = (
  axis: p5.Vector,
  angleRad: number
): Quaternion => {
  const half = angleRad / 2;
  const sinHalf = Math.sin(half);
  return {
    w: Math.cos(half),
    x: axis.x * sinHalf,
    y: axis.y * sinHalf,
    z: axis.z * sinHalf,
  };
};

const quaternionNormalize = (q: Quaternion): Quaternion => {
  const length = Math.hypot(q.w, q.x, q.y, q.z);
  return {
    w: q.w / length,
    x: q.x / length,
    y: q.y / length,
    z: q.z / length,
  };
};

const quaternionMultiply = (a: Quaternion, b: Quaternion): Quaternion => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});

const quaternionRotateVector = (
  p: p5,
  quaternion: Quaternion,
  vector: p5.Vector
): p5.Vector => {
  const u = p.createVector(quaternion.x, quaternion.y, quaternion.z);
  const uv = u.copy().dot(u);
  const term1 = vector.copy().mult(quaternion.w * quaternion.w - uv);
  const term2 = u.copy().mult(2 * u.dot(vector));
  const term3 = u.copy().cross(vector).mult(2 * quaternion.w);
  return term1.add(term2).add(term3);
};

const cubeFaceDefinitions: {
  signs: [number, number, number][];
  color: FaceColorName;
}[] = [
  {
    signs: [
      [1, 1, 1],
      [1, 1, -1],
      [1, -1, -1],
      [1, -1, 1],
    ],
    color: "red",
  },
  {
    signs: [
      [-1, 1, 1],
      [-1, -1, 1],
      [-1, -1, -1],
      [-1, 1, -1],
    ],
    color: "orange",
  },
  {
    signs: [
      [1, 1, 1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, 1, 1],
    ],
    color: "green",
  },
  {
    signs: [
      [1, -1, 1],
      [-1, -1, 1],
      [-1, -1, -1],
      [1, -1, -1],
    ],
    color: "blue",
  },
  {
    signs: [
      [1, 1, 1],
      [-1, 1, 1],
      [-1, -1, 1],
      [1, -1, 1],
    ],
    color: "white",
  },
  {
    signs: [
      [1, 1, -1],
      [1, -1, -1],
      [-1, -1, -1],
      [-1, 1, -1],
    ],
    color: "yellow",
  },
];

const sketch = (p: p5) => {
  const gridCells = 11;
  const gridSpacing = 60;
  const gridHalfCount = gridCells / 2;
  const gridRadius = gridHalfCount * gridSpacing;
  const axisLength = gridRadius + gridSpacing;

  const evenIndices = Array.from({ length: gridCells }, (_, idx) => idx).filter(
    (idx) => idx % 2 === 0
  );

  const symmetryQuaternions = CUBE_SYMMETRY_QUATERNIONS;
  const orientationGrid: {
    xIndex: number;
    yIndex: number;
    orientation: Quaternion;
  }[] = [];

  let entryIndex = 0;
  for (const xIndex of evenIndices) {
    for (const yIndex of evenIndices) {
      if (entryIndex >= symmetryQuaternions.length) break;
      const orientation = symmetryQuaternions[entryIndex++];
      orientationGrid.push({ xIndex, yIndex, orientation });
    }
    if (entryIndex >= symmetryQuaternions.length) break;
  }

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    canvas.parent("app");
    p.angleMode(p.DEGREES);
    p.setAttributes("antialias", true);
  };

  const drawCube = (xIndex: number, yIndex: number, rotation: Quaternion) => {
    const cubeSize = gridSpacing;
    const halfSize = cubeSize / 2;
    const cellCenterX = -gridRadius + gridSpacing / 2 + xIndex * gridSpacing;
    const cellCenterY = -gridRadius + gridSpacing / 2 + yIndex * gridSpacing;
    const center = p.createVector(cellCenterX, cellCenterY, halfSize);

    const vertex = ([sx, sy, sz]: [number, number, number]) => {
      const rotated = quaternionRotateVector(
        p,
        rotation,
        p.createVector(sx, sy, sz)
      );
      return center.copy().add(rotated.mult(halfSize));
    };

    const drawFace = (signs: [number, number, number][], colorName: FaceColorName) => {
      p.fill(getFaceColor(p, colorName));
      p.noStroke();
      p.beginShape();
      signs.forEach((sign) => {
        const vert = vertex(sign);
        p.vertex(vert.x, vert.y, vert.z);
      });
      p.endShape(p.CLOSE);
    };

    cubeFaceDefinitions.forEach(({ signs, color }) => drawFace(signs, color));
  };

  p.draw = () => {
    p.background(16);
    p.lights();
    p.push();
    p.orbitControl();
    drawCube(0, 0, ORIENTATION_QUATERNIONS["red:green"]);
    drawCube(2, 0, ORIENTATION_QUATERNIONS["red:blue"]);
    drawCube(4, 0, ORIENTATION_QUATERNIONS["red:white"]);
    drawCube(6, 0, ORIENTATION_QUATERNIONS["red:yellow"]);

    drawCube(0, 2, ORIENTATION_QUATERNIONS["orange:green"]);
    drawCube(2, 2, ORIENTATION_QUATERNIONS["orange:blue"]);
    drawCube(4, 2, ORIENTATION_QUATERNIONS["orange:white"]);
    drawCube(6, 2, ORIENTATION_QUATERNIONS["orange:yellow"]);

    drawCube(0, 4, ORIENTATION_QUATERNIONS["green:red"]);
    drawCube(2, 4, ORIENTATION_QUATERNIONS["green:orange"]);
    drawCube(4, 4, ORIENTATION_QUATERNIONS["green:white"]);
    drawCube(6, 4, ORIENTATION_QUATERNIONS["green:yellow"]);

    drawCube(0, 6, ORIENTATION_QUATERNIONS["blue:red"]);
    drawCube(2, 6, ORIENTATION_QUATERNIONS["blue:orange"]);
    drawCube(4, 6, ORIENTATION_QUATERNIONS["blue:white"]);
    drawCube(6, 6, ORIENTATION_QUATERNIONS["blue:yellow"]);

    drawCube(0, 8, ORIENTATION_QUATERNIONS["white:red"]);
    drawCube(2, 8, ORIENTATION_QUATERNIONS["white:orange"]);
    drawCube(4, 8, ORIENTATION_QUATERNIONS["white:green"]);
    drawCube(6, 8, ORIENTATION_QUATERNIONS["white:blue"]);

    drawCube(0, 10, ORIENTATION_QUATERNIONS["yellow:red"]);
    drawCube(2, 10, ORIENTATION_QUATERNIONS["yellow:orange"]);
    drawCube(4, 10, ORIENTATION_QUATERNIONS["yellow:green"]);
    drawCube(6, 10, ORIENTATION_QUATERNIONS["yellow:blue"]);

    
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
