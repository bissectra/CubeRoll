import p5 from "p5";

export type Quaternion = { w: number; x: number; y: number; z: number };

export const quaternionFromAxisAngle = (
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

export const quaternionNormalize = (q: Quaternion): Quaternion => {
  const length = Math.hypot(q.w, q.x, q.y, q.z);
  return {
    w: q.w / length,
    x: q.x / length,
    y: q.y / length,
    z: q.z / length,
  };
};

export const quaternionMultiply = (a: Quaternion, b: Quaternion): Quaternion => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});

export const quaternionRotateVector = (
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
