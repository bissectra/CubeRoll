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

type FaceOrientationKey = `${FaceColorName}:${FaceColorName}`;

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

const cross = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const normalizeVector = (v: Vector3): Vector3 => {
  const length = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};

const quaternionFromMatrix = (m: {
  r00: number;
  r01: number;
  r02: number;
  r10: number;
  r11: number;
  r12: number;
  r20: number;
  r21: number;
  r22: number;
}): Quaternion => {
  const trace = m.r00 + m.r11 + m.r22;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return {
      w: 0.25 / s,
      x: (m.r21 - m.r12) * s,
      y: (m.r02 - m.r20) * s,
      z: (m.r10 - m.r01) * s,
    };
  }

  if (m.r00 > m.r11 && m.r00 > m.r22) {
    const s = 2 * Math.sqrt(1 + m.r00 - m.r11 - m.r22);
    return {
      w: (m.r21 - m.r12) / s,
      x: 0.25 * s,
      y: (m.r01 + m.r10) / s,
      z: (m.r02 + m.r20) / s,
    };
  }

  if (m.r11 > m.r22) {
    const s = 2 * Math.sqrt(1 + m.r11 - m.r00 - m.r22);
    return {
      w: (m.r02 - m.r20) / s,
      x: (m.r01 + m.r10) / s,
      y: 0.25 * s,
      z: (m.r12 + m.r21) / s,
    };
  }

  const s = 2 * Math.sqrt(1 + m.r22 - m.r00 - m.r11);
  return {
    w: (m.r10 - m.r01) / s,
    x: (m.r02 + m.r20) / s,
    y: (m.r12 + m.r21) / s,
    z: 0.25 * s,
  };
};

const quaternionFromAxes = (
  xAxis: Vector3,
  yAxis: Vector3,
  zAxis: Vector3
): Quaternion =>
  quaternionFromMatrix({
    r00: xAxis.x,
    r01: yAxis.x,
    r02: zAxis.x,
    r10: xAxis.y,
    r11: yAxis.y,
    r12: zAxis.y,
    r20: xAxis.z,
    r21: yAxis.z,
    r22: zAxis.z,
  });

const ORIENTATION_QUATERNIONS: Record<FaceOrientationKey, Quaternion> = (() => {
  const map = {} as Record<FaceOrientationKey, Quaternion>;

  FACE_COLOR_NAMES.forEach((zColor) => {
    FACE_COLOR_NAMES.forEach((xColor) => {
      if (xColor === zColor || xColor === OPPOSITE_FACE_COLOR[zColor]) return;
      const key = `${zColor}:${xColor}` as FaceOrientationKey;
      const zAxis = COLOR_AXIS[zColor];
      const xAxis = COLOR_AXIS[xColor];
      const yAxis = normalizeVector(cross(zAxis, xAxis));
      map[key] = quaternionFromAxes(xAxis, yAxis, zAxis);
    });
  });

  return map;
})();

const getOrientationQuaternion = (key: FaceOrientationKey) =>
  ORIENTATION_QUATERNIONS[key];

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
  const gridCells = 5;
  const gridSpacing = 60;
  const gridHalfCount = gridCells / 2;
  const gridRadius = gridHalfCount * gridSpacing;
  const axisLength = gridRadius + gridSpacing;

  const baseOrientation: FaceOrientationKey = "white:red";
  let cubeRotation: Quaternion = quaternionNormalize(
    { ...getOrientationQuaternion(baseOrientation) }
  );

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
    const spinAxis = p.createVector(0.4, 1, 0.2).normalize();
    const deltaQuat = quaternionFromAxisAngle(spinAxis, p.radians(0.7));
    cubeRotation = quaternionNormalize(quaternionMultiply(deltaQuat, cubeRotation));

    p.background(16);
    p.lights();
    p.push();
    p.orbitControl();
    drawCube(1, 3, cubeRotation);
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
