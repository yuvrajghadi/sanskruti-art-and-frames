import { DimensionUnit, FrameSample, MatOption } from '../types';

export type FrameSide = 'top' | 'bottom' | 'left' | 'right';

export interface SvgPoint2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Deterministic single source of truth for frame physical dimensions in inches (1 unit = 1 inch).
 */
export interface FramePhysicalMetrics {
  artworkWidthIn: number;
  artworkHeightIn: number;
  matBorderIn: number;
  mouldingFaceIn: number;
  mouldingDepthIn: number;
  innerWidthIn: number;
  innerHeightIn: number;
  outerWidthIn: number;
  outerHeightIn: number;
  halfOuterW: number;
  halfOuterH: number;
  halfInnerW: number;
  halfInnerH: number;
  halfArtW: number;
  halfArtH: number;
  /** Physical perimeter repeat period for the moulding strip (3.5 x face width in inches). */
  texturePeriodIn: number;
}

export interface SvgRailGeometry {
  side: FrameSide;
  /** 4 trapezoid vertices in clockwise order: outerStart -> outerEnd -> innerEnd -> innerStart. */
  polygonPoints: [SvgPoint2D, SvgPoint2D, SvgPoint2D, SvgPoint2D];
  polygonString: string;
  /** SVG linear/chamfer inner-to-outer points (for symmetrical outer rim accent). */
  outerChamferPointsString: string;
  /** Miter joint diagonal line at the start corner (outer -> inner). */
  miterLine: { x1: number; y1: number; x2: number; y2: number };
  /** Inner sightline beaded fillet coordinates along the bar center-inner step (0.9 * fW). */
  filletLine: { x1: number; y1: number; x2: number; y2: number };
  /** Exact length of outer rim in SVG units. */
  outerLengthSvg: number;
  /** Exploded CAD view translation offset in SVG units. */
  explodedOffset: SvgPoint2D;
}

export interface FrameSvgGeometry {
  metrics: FramePhysicalMetrics;
  scale: number;
  vbW: number;
  vbH: number;
  mouldingFaceSvg: number;
  matBorderSvg: number;
  artX: number;
  artY: number;
  artW: number;
  artH: number;
  outerStepSvg: number;
  friezeStepSvg: number;
  rails: Record<FrameSide, SvgRailGeometry>;
}

/** Cross-section profile sample: t in [0 (outer), 1 (inner)], z in [0 (back), mouldingDepthIn]. */
export interface ProfileSectionPoint {
  t: number;
  d: number;
  z: number;
}

export interface MiteredRailBuffers {
  side: FrameSide;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

export interface MiterValidationReport {
  valid: boolean;
  maxCornerGapIn: number;
  oppositeWidthDeltaIn: number;
  outerInnerSymmetryErrorIn: number;
  details: string[];
}

const CM_PER_INCH = 2.54;
const DEFAULT_SVG_VIEWBOX_MAX = 750;
const TILE_ASPECT_RATIO = 3.5;

export function toInches(value: number, unit: DimensionUnit): number {
  const safe = Number.isFinite(value) && value > 0 ? value : 1;
  return unit === 'cm' ? safe / CM_PER_INCH : safe;
}

/**
 * Computes exact deterministic physical frame metrics in inches (1 world unit = 1 physical inch).
 * Enforces:
 *   innerWidth = artworkWidth + 2 * matBorderWidth
 *   innerHeight = artworkHeight + 2 * matBorderWidth
 *   outerWidth = innerWidth + 2 * mouldingFaceWidth
 *   outerHeight = innerHeight + 2 * mouldingFaceWidth
 */
export function computePhysicalMetrics(
  frame: Pick<FrameSample, 'profileWidth' | 'depth'>,
  width: number,
  height: number,
  unit: DimensionUnit,
  mat: Pick<MatOption, 'id' | 'borderWidth'>
): FramePhysicalMetrics {
  const artworkWidthIn = toInches(width, unit);
  const artworkHeightIn = toInches(height, unit);
  const isMatDisabled = mat.id === 'mat-none' || !Number.isFinite(mat.borderWidth) || mat.borderWidth <= 0;
  const matBorderIn = isMatDisabled ? 0 : mat.borderWidth;
  const mouldingFaceIn = Number.isFinite(frame.profileWidth) && frame.profileWidth > 0 ? frame.profileWidth : 1.5;
  const mouldingDepthIn = Number.isFinite(frame.depth) && frame.depth > 0 ? frame.depth : 1.0;

  const innerWidthIn = artworkWidthIn + 2 * matBorderIn;
  const innerHeightIn = artworkHeightIn + 2 * matBorderIn;
  const outerWidthIn = innerWidthIn + 2 * mouldingFaceIn;
  const outerHeightIn = innerHeightIn + 2 * mouldingFaceIn;

  return {
    artworkWidthIn,
    artworkHeightIn,
    matBorderIn,
    mouldingFaceIn,
    mouldingDepthIn,
    innerWidthIn,
    innerHeightIn,
    outerWidthIn,
    outerHeightIn,
    halfOuterW: outerWidthIn / 2,
    halfOuterH: outerHeightIn / 2,
    halfInnerW: innerWidthIn / 2,
    halfInnerH: innerHeightIn / 2,
    halfArtW: artworkWidthIn / 2,
    halfArtH: artworkHeightIn / 2,
    texturePeriodIn: mouldingFaceIn * TILE_ASPECT_RATIO,
  };
}

function ptsToString(pts: SvgPoint2D[]): string {
  return pts.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(' ');
}

/**
 * Computes exact SVG viewBox geometry with 45° miter corners and identical face width on all 4 rails.
 */
export function computeSvgGeometry(
  frame: Pick<FrameSample, 'profileWidth' | 'depth'>,
  width: number,
  height: number,
  unit: DimensionUnit,
  mat: Pick<MatOption, 'id' | 'borderWidth'>,
  targetMaxDim = DEFAULT_SVG_VIEWBOX_MAX
): FrameSvgGeometry {
  const metrics = computePhysicalMetrics(frame, width, height, unit, mat);
  const maxOuter = Math.max(metrics.outerWidthIn, metrics.outerHeightIn);
  const scale = targetMaxDim / maxOuter;

  const vbW = metrics.outerWidthIn * scale;
  const vbH = metrics.outerHeightIn * scale;
  const fW = metrics.mouldingFaceIn * scale;
  const mW = metrics.matBorderIn * scale;
  const artX = fW + mW;
  const artY = fW + mW;
  const artW = metrics.artworkWidthIn * scale;
  const artH = metrics.artworkHeightIn * scale;
  const outerStepSvg = fW * 0.16;
  const friezeStepSvg = fW * 0.80;
  const filletOffset = fW * 0.90;

  const makeRail = (
    side: FrameSide,
    poly: [SvgPoint2D, SvgPoint2D, SvgPoint2D, SvgPoint2D],
    chamferPoly: [SvgPoint2D, SvgPoint2D, SvgPoint2D, SvgPoint2D],
    miterLine: { x1: number; y1: number; x2: number; y2: number },
    filletLine: { x1: number; y1: number; x2: number; y2: number },
    outerLengthSvg: number,
    explodedOffset: SvgPoint2D
  ): SvgRailGeometry => ({
    side,
    polygonPoints: poly,
    polygonString: ptsToString(poly),
    outerChamferPointsString: ptsToString(chamferPoly),
    miterLine,
    filletLine,
    outerLengthSvg,
    explodedOffset,
  });

  const top = makeRail(
    'top',
    [
      { x: 0, y: 0 },
      { x: vbW, y: 0 },
      { x: vbW - fW, y: fW },
      { x: fW, y: fW },
    ],
    [
      { x: 0, y: 0 },
      { x: vbW, y: 0 },
      { x: vbW - outerStepSvg, y: outerStepSvg },
      { x: outerStepSvg, y: outerStepSvg },
    ],
    { x1: 0, y1: 0, x2: fW, y2: fW },
    { x1: filletOffset, y1: filletOffset, x2: vbW - filletOffset, y2: filletOffset },
    vbW,
    { x: 0, y: -24 }
  );

  const bottom = makeRail(
    'bottom',
    [
      { x: 0, y: vbH },
      { x: vbW, y: vbH },
      { x: vbW - fW, y: vbH - fW },
      { x: fW, y: vbH - fW },
    ],
    [
      { x: 0, y: vbH },
      { x: vbW, y: vbH },
      { x: vbW - outerStepSvg, y: vbH - outerStepSvg },
      { x: outerStepSvg, y: vbH - outerStepSvg },
    ],
    { x1: vbW, y1: vbH, x2: vbW - fW, y2: vbH - fW },
    { x1: filletOffset, y1: vbH - filletOffset, x2: vbW - filletOffset, y2: vbH - filletOffset },
    vbW,
    { x: 0, y: 24 }
  );

  const left = makeRail(
    'left',
    [
      { x: 0, y: 0 },
      { x: fW, y: fW },
      { x: fW, y: vbH - fW },
      { x: 0, y: vbH },
    ],
    [
      { x: 0, y: 0 },
      { x: outerStepSvg, y: outerStepSvg },
      { x: outerStepSvg, y: vbH - outerStepSvg },
      { x: 0, y: vbH },
    ],
    { x1: 0, y1: vbH, x2: fW, y2: vbH - fW },
    { x1: filletOffset, y1: filletOffset, x2: filletOffset, y2: vbH - filletOffset },
    vbH,
    { x: -24, y: 0 }
  );

  const right = makeRail(
    'right',
    [
      { x: vbW, y: 0 },
      { x: vbW, y: vbH },
      { x: vbW - fW, y: vbH - fW },
      { x: vbW - fW, y: fW },
    ],
    [
      { x: vbW, y: 0 },
      { x: vbW, y: vbH },
      { x: vbW - outerStepSvg, y: vbH - outerStepSvg },
      { x: vbW - outerStepSvg, y: outerStepSvg },
    ],
    { x1: vbW, y1: 0, x2: vbW - fW, y2: fW },
    { x1: vbW - filletOffset, y1: filletOffset, x2: vbW - filletOffset, y2: vbH - filletOffset },
    vbH,
    { x: 24, y: 0 }
  );

  return {
    metrics,
    scale,
    vbW,
    vbH,
    mouldingFaceSvg: fW,
    matBorderSvg: mW,
    artX,
    artY,
    artW,
    artH,
    outerStepSvg,
    friezeStepSvg,
    rails: { top, bottom, left, right },
  };
}

/**
 * Builds a clean, closed, outward-facing physical moulding cross-section loop from profileCurve.
 * Front surface runs from t=0 (outer rim) to t=1 (inner sightline), followed by rabbet step & flat wall back.
 * Returns separate front-face points (used for continuous photometric texture UVs) and structural back-return points.
 */
export function buildCrossSectionLoop(
  faceWidthIn: number,
  depthIn: number,
  profileCurve?: Array<[number, number]>,
  rabbetDepthIn?: number
): { front: ProfileSectionPoint[]; structural: ProfileSectionPoint[] } {
  const defaultCurve: Array<[number, number]> = [
    [0.00, 0.90],
    [0.12, 0.98],
    [0.30, 0.92],
    [0.70, 0.94],
    [0.88, 0.98],
    [1.00, 0.56],
  ];

  const source = profileCurve && profileCurve.length >= 2 ? profileCurve : defaultCurve;
  const sorted = [...source]
    .map(([t, z]): [number, number] => [Math.max(0, Math.min(1, t)), Math.max(0.25, Math.min(1.05, z))])
    .sort((a, b) => a[0] - b[0]);

  // Ensure exact outer endpoint t=0 and inner endpoint t=1
  if (sorted[0][0] > 0) sorted.unshift([0, sorted[0][1]]);
  if (sorted[sorted.length - 1][0] < 1) sorted.push([1, sorted[sorted.length - 1][1]]);

  const front: ProfileSectionPoint[] = sorted.map(([t, zr]) => ({
    t,
    d: t * faceWidthIn,
    z: zr * depthIn,
  }));

  const rabbetZ = Math.max(0.08 * depthIn, Math.min(front[front.length - 1].z * 0.72, depthIn * 0.36, rabbetDepthIn ? depthIn - rabbetDepthIn : depthIn * 0.32));

  // Structural return loop (closed cleanly around inner rabbet, back wall, outer side wall)
  const structural: ProfileSectionPoint[] = [
    front[front.length - 1],
    { t: 1.0, d: faceWidthIn, z: rabbetZ },
    { t: 1.0, d: faceWidthIn * 1.06, z: rabbetZ },
    { t: 1.0, d: faceWidthIn * 1.06, z: 0 },
    { t: 0.0, d: 0, z: 0 },
    front[0],
  ];

  return { front, structural };
}

function mapRailPoint(
  side: FrameSide,
  halfOuterW: number,
  halfOuterH: number,
  d: number,
  z: number,
  isEnd: boolean
): Point3D {
  switch (side) {
    case 'top':
      return {
        x: isEnd ? halfOuterW - d : -halfOuterW + d,
        y: halfOuterH - d,
        z,
      };
    case 'bottom':
      return {
        x: isEnd ? -halfOuterW + d : halfOuterW - d,
        y: -halfOuterH + d,
        z,
      };
    case 'left':
      return {
        x: -halfOuterW + d,
        y: isEnd ? halfOuterH - d : -halfOuterH + d,
        z,
      };
    case 'right':
      return {
        x: halfOuterW - d,
        y: isEnd ? -halfOuterH + d : halfOuterH - d,
        z,
      };
  }
}

/**
 * Generates watertight 45-degree mitered 3D prism buffers for one rail using the shared
 * cross-section and symmetrical UV normalization (v = 1 - t with Three.js CanvasTexture flipY=true
 * so canvas row y=0 outer rim maps strictly to outer rim t=0 on ALL 4 rails with zero ClampToEdge smear).
 */
export function buildMiteredRailBuffers(
  side: FrameSide,
  metrics: FramePhysicalMetrics,
  section: { front: ProfileSectionPoint[]; structural: ProfileSectionPoint[] }
): MiteredRailBuffers {
  const { halfOuterW, halfOuterH, texturePeriodIn } = metrics;
  const barOuterLen = side === 'top' || side === 'bottom' ? metrics.outerWidthIn : metrics.outerHeightIn;
  const period = Math.max(0.25, texturePeriodIn);
  const frontPts = section.front;

  const posList: number[] = [];
  const uvList: number[] = [];
  const idxList: number[] = [];

  const pushQuad = (
    p00: Point3D,
    p10: Point3D,
    p11: Point3D,
    p01: Point3D,
    u00: number,
    v00: number,
    u10: number,
    v10: number,
    u11: number,
    v11: number,
    u01: number,
    v01: number
  ) => {
    const base = posList.length / 3;
    posList.push(
      p00.x, p00.y, p00.z,
      p10.x, p10.y, p10.z,
      p11.x, p11.y, p11.z,
      p01.x, p01.y, p01.z
    );
    uvList.push(u00, v00, u10, v10, u11, v11, u01, v01);
    idxList.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  // Helper: symmetric longitudinal coordinate u centered on rail center so opposite edges match identically
  // and corner diagonals (at offset d from outer end) share exact UV phase.
  const uStartAtD = (d: number) => (d - barOuterLen * 0.5) / period + 10.0;
  const uEndAtD = (d: number) => (barOuterLen - d - barOuterLen * 0.5) / period + 10.0;

  // 1. Sculpted front profile quads (exact photometric UV orientation: v = 1 -> outer rim t=0, v = 0 -> inner sightline t=1)
  for (let i = 0; i < frontPts.length - 1; i++) {
    const a = frontPts[i];
    const b = frontPts[i + 1];
    const pStartA = mapRailPoint(side, halfOuterW, halfOuterH, a.d, a.z, false);
    const pEndA = mapRailPoint(side, halfOuterW, halfOuterH, a.d, a.z, true);
    const pEndB = mapRailPoint(side, halfOuterW, halfOuterH, b.d, b.z, true);
    const pStartB = mapRailPoint(side, halfOuterW, halfOuterH, b.d, b.z, false);

    // Keep v strictly inside (0.004, 0.996) to guarantee zero ClampToEdge wrap bleeding on top/bottom border pixels
    const vA = 0.996 - a.t * 0.992;
    const vB = 0.996 - b.t * 0.992;

    pushQuad(
      pStartA, pEndA, pEndB, pStartB,
      uStartAtD(a.d), vA,
      uEndAtD(a.d), vA,
      uEndAtD(b.d), vB,
      uStartAtD(b.d), vB
    );
  }

  // 2. Structural rabbet, back wall & outer side wall (mapped gently to edge tone of texture)
  const structPts = section.structural;
  for (let i = 0; i < structPts.length - 1; i++) {
    const a = structPts[i];
    const b = structPts[i + 1];
    const pStartA = mapRailPoint(side, halfOuterW, halfOuterH, a.d, a.z, false);
    const pEndA = mapRailPoint(side, halfOuterW, halfOuterH, a.d, a.z, true);
    const pEndB = mapRailPoint(side, halfOuterW, halfOuterH, b.d, b.z, true);
    const pStartB = mapRailPoint(side, halfOuterW, halfOuterH, b.d, b.z, false);

    const vA = a.t >= 0.5 ? 0.02 : 0.98;
    const vB = b.t >= 0.5 ? 0.02 : 0.98;

    pushQuad(
      pStartA, pEndA, pEndB, pStartB,
      uStartAtD(a.d), vA,
      uEndAtD(a.d), vA,
      uEndAtD(b.d), vB,
      uStartAtD(b.d), vB
    );
  }

  // Compute clean non-indexed vertex normals per quad and then weld identical vertices on the front surface
  // using face-weighted normal accumulation across shared cross-section vertices, while keeping sharp creases
  // between structural returns and the front profile.
  const positions = new Float32Array(posList);
  const uvs = new Float32Array(uvList);
  const indices = new Uint32Array(idxList);
  const normals = new Float32Array(positions.length);

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;

    const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
    const bx = positions[ib], by = positions[ib + 1], bz = positions[ib + 2];
    const cx = positions[ic], cy = positions[ic + 1], cz = positions[ic + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
    normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
    normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }

  return { side, positions, normals, uvs, indices };
}

/**
 * Validates mathematical miter continuity, zero-gap corner intersections, and 4-side symmetry.
 */
export function validateFrameGeometry(
  frame: Pick<FrameSample, 'profileWidth' | 'depth'>,
  width: number,
  height: number,
  unit: DimensionUnit,
  mat: Pick<MatOption, 'id' | 'borderWidth'>,
  profileCurve?: Array<[number, number]>
): MiterValidationReport {
  const svgGeom = computeSvgGeometry(frame, width, height, unit, mat);
  const m = svgGeom.metrics;
  const section = buildCrossSectionLoop(m.mouldingFaceIn, m.mouldingDepthIn, profileCurve);
  const details: string[] = [];

  // Check SVG opposite face widths
  const topWidth = svgGeom.rails.top.polygonPoints[3].y - svgGeom.rails.top.polygonPoints[0].y;
  const bottomWidth = svgGeom.rails.bottom.polygonPoints[0].y - svgGeom.rails.bottom.polygonPoints[3].y;
  const leftWidth = svgGeom.rails.left.polygonPoints[1].x - svgGeom.rails.left.polygonPoints[0].x;
  const rightWidth = svgGeom.rails.right.polygonPoints[0].x - svgGeom.rails.right.polygonPoints[3].x;

  const widthsIn = [topWidth, bottomWidth, leftWidth, rightWidth].map((px) => px / svgGeom.scale);
  const oppositeWidthDeltaIn = Math.max(
    Math.abs(widthsIn[0] - widthsIn[1]),
    Math.abs(widthsIn[2] - widthsIn[3]),
    Math.abs(widthsIn[0] - m.mouldingFaceIn)
  );

  // Check 3D miter endpoint coincidence across all 4 corners and all cross-section samples
  let maxCornerGapIn = 0;
  const dPairs: Array<[FrameSide, boolean, FrameSide, boolean]> = [
    ['top', false, 'left', true],
    ['top', true, 'right', false],
    ['right', true, 'bottom', false],
    ['bottom', true, 'left', false],
  ];

  for (const pt of [...section.front, ...section.structural]) {
    for (const [sideA, endA, sideB, endB] of dPairs) {
      const pA = mapRailPoint(sideA, m.halfOuterW, m.halfOuterH, pt.d, pt.z, endA);
      const pB = mapRailPoint(sideB, m.halfOuterW, m.halfOuterH, pt.d, pt.z, endB);
      const dist = Math.hypot(pA.x - pB.x, pA.y - pB.y, pA.z - pB.z);
      if (dist > maxCornerGapIn) maxCornerGapIn = dist;
    }
  }

  // Check outer-inner equation accuracy
  const outerInnerSymmetryErrorIn = Math.max(
    Math.abs(m.innerWidthIn - (m.artworkWidthIn + 2 * m.matBorderIn)),
    Math.abs(m.innerHeightIn - (m.artworkHeightIn + 2 * m.matBorderIn)),
    Math.abs(m.outerWidthIn - (m.innerWidthIn + 2 * m.mouldingFaceIn)),
    Math.abs(m.outerHeightIn - (m.innerHeightIn + 2 * m.mouldingFaceIn))
  );

  const valid = maxCornerGapIn < 1e-6 && oppositeWidthDeltaIn < 1e-6 && outerInnerSymmetryErrorIn < 1e-6;
  details.push(
    `Outer: ${m.outerWidthIn.toFixed(2)}" x ${m.outerHeightIn.toFixed(2)}", Inner: ${m.innerWidthIn.toFixed(2)}" x ${m.innerHeightIn.toFixed(2)}"`,
    `Face widths [T/B/L/R]: ${widthsIn.map((w) => w.toFixed(4)).join('/')} in`,
    `Max 3D corner gap: ${maxCornerGapIn.toExponential(2)} in`,
    `Boundary equation error: ${outerInnerSymmetryErrorIn.toExponential(2)} in`
  );

  return {
    valid,
    maxCornerGapIn,
    oppositeWidthDeltaIn,
    outerInnerSymmetryErrorIn,
    details,
  };
}
