import p5 from "p5";
import { Quaternion, quaternionRotateVector } from "./quaternions";

export const GRID_CELLS = 11;
export const GRID_SPACING = 60;
export const GRID_HALF_COUNT = GRID_CELLS / 2;
export const GRID_RADIUS = GRID_HALF_COUNT * GRID_SPACING;
export const AXIS_LENGTH = GRID_RADIUS + GRID_SPACING;

export type FaceColorName = "red" | "orange" | "green" | "blue" | "white" | "yellow";

export type FaceOrientationKey =
  | "red:green"
  | "red:blue"
  | "red:white"
  | "red:yellow"
  | "orange:green"
  | "orange:blue"
  | "orange:white"
  | "orange:yellow"
  | "green:red"
  | "green:orange"
  | "green:white"
  | "green:yellow"
  | "blue:red"
  | "blue:orange"
  | "blue:white"
  | "blue:yellow"
  | "white:red"
  | "white:orange"
  | "white:green"
  | "white:blue"
  | "yellow:red"
  | "yellow:orange"
  | "yellow:green"
  | "yellow:blue";

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

export const CUBE_SYMMETRY_QUATERNIONS = CUBE_SYMMETRY_KEYS.map(
  (key) => ORIENTATION_QUATERNIONS[key]
);

const cubeFaceDefinitions: {
  signs: [number, number, number][];
  color: FaceColorName;
}[] = [
  // red face
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

export function drawCube(
  p: p5,
  xIndex: number,
  yIndex: number,
  rotation: Quaternion
) {
  const cubeSize = GRID_SPACING;
  const halfSize = cubeSize / 2;
  const cellCenterX = -GRID_RADIUS + GRID_SPACING / 2 + xIndex * GRID_SPACING;
  const cellCenterY = -GRID_RADIUS + GRID_SPACING / 2 + yIndex * GRID_SPACING;
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
}

export function drawFloor(
  p: p5,
  xIndex: number,
  yIndex: number,
  colorName: FaceColorName
) {
  const halfSpacing = GRID_SPACING / 2;
  const cellCenterX = -GRID_RADIUS + halfSpacing + xIndex * GRID_SPACING;
  const cellCenterY = -GRID_RADIUS + halfSpacing + yIndex * GRID_SPACING;
  const floorZ = -0.1;

  const corners: [number, number][] = [
    [cellCenterX - halfSpacing, cellCenterY - halfSpacing],
    [cellCenterX + halfSpacing, cellCenterY - halfSpacing],
    [cellCenterX + halfSpacing, cellCenterY + halfSpacing],
    [cellCenterX - halfSpacing, cellCenterY + halfSpacing],
  ];

  p.push();
  p.noStroke();
  p.fill(getFaceColor(p, colorName));
  p.beginShape();
  corners.forEach(([x, y]) => {
    p.vertex(x, y, floorZ);
  });
  p.endShape(p.CLOSE);
  p.pop();
}

export { ORIENTATION_QUATERNIONS };
