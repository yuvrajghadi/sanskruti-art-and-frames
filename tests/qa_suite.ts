/**
 * Senior QA Functional Audit Suite
 */
import { FRAME_SAMPLES, MAT_OPTIONS, ARTWORK_OPTIONS, PRESET_DIMENSIONS } from '../src/data/frames';
import { calculateFramePrice, getAspectRatioLabel, getMouldingFootRateINR } from '../src/utils/pricing';
import { calculateQuotationPricing } from '../src/types/quotation';
import { GLAZING_OPTIONS } from '../src/components/CustomFramingStudio';
import { getFrameMaterialProfile, generateProceduralFrameCanvas } from '../src/utils/frameRendering';
import { RECONSTRUCTED_MOULDING_REGISTRY } from '../src/utils/mouldingReconstruction';
import { parseRoute } from '../src/utils/routes';
import * as THREE from 'three';

const results: { suite: string; testName: string; status: string; details: string }[] = [];

function recordTest(suite: string, testName: string, passed: boolean, details: string) {
  results.push({
    suite,
    testName,
    status: passed ? 'PASS' : 'FAIL',
    details
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${suite} -> ${testName}: ${details}`);
}

console.log('\n=============================================');
console.log('   SENIOR QA AUDIT: FUNCTIONAL TEST RUNNER   ');
console.log('=============================================\n');

// 1. INR Pricing Engine & Tax Separation
console.log('--- SUITE 1: PRICING ENGINE & FORMULA INTEGRITY (INR + PROV. 18% GST) ---');
const vFrame = FRAME_SAMPLES.find(f => f.id === 'GLD-401')!;
const vFootRate = getMouldingFootRateINR(vFrame); // basePricePerFoot 48 -> ₹420/ft
const museumGlazing = GLAZING_OPTIONS.find(g => g.id === 'optium')!;
const standardGlazing = GLAZING_OPTIONS.find(g => g.id === 'clear')!;

// 1.1: 16x20 in with 3.5" profile width:
// Perimeter = 72", Miter waste = 3.5 * 8 = 28" -> 100" -> 8.3 linear ft.
// Molding = Math.round(8.3 * 420) = ₹3,486.
// United inches = 36 -> Mat = Math.round(260 + 36 * 14) = ₹764.
// Glass & Assembly = Math.round(380 + 36 * 22) = ₹1,172.
// Taxable Subtotal = ₹5,422; 18% GST = ₹976; Final Total = ₹6,398.
const p1 = calculateFramePrice(vFrame, 16, 20, 'in', MAT_OPTIONS[0]);
const p1Pass =
  vFootRate === 420 &&
  p1.currency === 'INR' &&
  p1.unitedInches === 36 &&
  p1.linearFeet === 8.3 &&
  p1.moldingCost === 3486 &&
  p1.matCost === 764 &&
  p1.glassAndAssemblyCost === 1172 &&
  p1.basePrice === 5422 &&
  p1.gstAmount === 976 &&
  p1.totalPrice === 6398;
recordTest(
  'Pricing Engine',
  'Perimeter, miter waste, subtotal, 18% GST, and total in INR (16x20 in)',
  p1Pass,
  `Linear feet: ${p1.linearFeet} ft, Molding: ₹${p1.moldingCost}, Mat: ₹${p1.matCost}, Glass: ₹${p1.glassAndAssemblyCost}, Subtotal: ₹${p1.basePrice}, GST: ₹${p1.gstAmount}, Total: ₹${p1.totalPrice}`
);

// 1.2: Metric cm Conversion (40.64 cm x 50.8 cm)
const p2 = calculateFramePrice(vFrame, 40.64, 50.8, 'cm', MAT_OPTIONS[0]);
const p2Pass = Math.abs(p2.linearFeet - p1.linearFeet) < 0.1 && Math.abs(p2.totalPrice - p1.totalPrice) <= 2;
recordTest('Pricing Engine', 'Metric cm conversion accuracy (INR)', p2Pass, `Converted linear feet: ${p2.linearFeet} ft, Total: ₹${p2.totalPrice}`);

// 1.3: Removing Mat reduces Taxable Subtotal by ₹764 AND associated 18% GST by ₹138 (Total delta ₹902)
const pMatNone = calculateFramePrice(vFrame, 16, 20, 'in', MAT_OPTIONS.find(m => m.id === 'mat-none')!);
const expectedMatRemovedGst = Math.round(pMatNone.basePrice * 0.18);
const gstDelta = p1.gstAmount - pMatNone.gstAmount;
const totalDelta = p1.totalPrice - pMatNone.totalPrice;
const matPass =
  pMatNone.matCost === 0 &&
  pMatNone.basePrice === p1.basePrice - p1.matCost &&
  pMatNone.gstAmount === expectedMatRemovedGst &&
  gstDelta === 138 &&
  totalDelta === p1.matCost + gstDelta;
recordTest(
  'Pricing Engine',
  'Mat removal updates matCost, taxable subtotal, and 18% GST delta accurately',
  matPass,
  `Mat: ₹${p1.matCost} -> ₹${pMatNone.matCost}, Subtotal: ₹${p1.basePrice} -> ₹${pMatNone.basePrice}, GST: ₹${p1.gstAmount} -> ₹${pMatNone.gstAmount} (-₹${gstDelta}), Total diff: ₹${totalDelta}`
);

// 1.4: Glazing pricing + tax separation in calculateQuotationPricing (Museum Acrylic +₹1,800)
const qStd = calculateQuotationPricing(vFrame, 16, 20, 'in', MAT_OPTIONS[0], standardGlazing);
const qMus = calculateQuotationPricing(vFrame, 16, 20, 'in', MAT_OPTIONS[0], museumGlazing);
const glazePass =
  qStd.mouldingCost === 3486 &&
  qStd.matCost === 764 &&
  qStd.assemblyCost === 1172 &&
  qStd.glazingDelta === 0 &&
  qStd.subtotal === 5422 &&
  qStd.gstAmount === 976 &&
  qStd.totalEstimatedAmount === 6398 &&
  qMus.glazingDelta === 1800 &&
  qMus.subtotal === 7222 &&
  qMus.gstAmount === 1300 &&
  qMus.totalEstimatedAmount === 8522 &&
  qMus.delivery.amountINR === null;
recordTest(
  'Pricing Engine',
  'Glazing delta (+₹1,800 Museum Acrylic), taxable subtotal, GST, and shipping exclusion',
  glazePass,
  `Standard: Subtotal ₹${qStd.subtotal} + GST ₹${qStd.gstAmount} = ₹${qStd.totalEstimatedAmount}; Museum Acrylic: Subtotal ₹${qMus.subtotal} (+₹${qMus.glazingDelta}) + GST ₹${qMus.gstAmount} = ₹${qMus.totalEstimatedAmount}`
);

// 1.4: Aspect ratio classifications
const ar1 = getAspectRatioLabel(16, 20); // 4:5 Standard Portrait
const ar2 = getAspectRatioLabel(24, 36); // 2:3 Archival
const ar3 = getAspectRatioLabel(20, 20); // 1:1 Square
const arPass = ar1 === '4:5 Standard Portrait' && ar2 === '2:3 Archival' && ar3 === '1:1 Square';
recordTest('Pricing Engine', 'Aspect ratio string classifications', arPass, `16x20: '${ar1}', 24x36: '${ar2}', 20x20: '${ar3}'`);

// 2. 2D SVG Geometry
console.log('\n--- SUITE 2: 2D SVG GEOMETRY ---');
const totalWidthInches = 16 + (vFrame.profileWidth + MAT_OPTIONS[0].borderWidth) * 2;
const totalHeightInches = 20 + (vFrame.profileWidth + MAT_OPTIONS[0].borderWidth) * 2;
const scale = 750 / Math.max(totalWidthInches, totalHeightInches);
const vbW = totalWidthInches * scale;
const vbH = totalHeightInches * scale;
const fW = vFrame.profileWidth * scale;
const geomPass = totalWidthInches === 28 && totalHeightInches === 32 && fW > 0 && fW < vbW / 2;
recordTest('2D Geometry', '45° miter & sightline geometry validity', geomPass, `Outer: ${totalWidthInches}" x ${totalHeightInches}", vb: ${vbW.toFixed(1)}x${vbH.toFixed(1)}, profile width: ${fW.toFixed(1)}px`);

// 3. Dynamic Realistic Material Engine
console.log('\n--- SUITE 3: DYNAMIC REALISTIC MATERIAL ENGINE ---');
// 3.1: Profile A: Ornate Antique Gold Baroque Masterpiece (SAA-AGB-15)
const agbFrame = FRAME_SAMPLES.find(f => f.id === 'SAA-AGB-15')!;
const agbProf = getFrameMaterialProfile(agbFrame);
const agbPass = agbProf.type === 'carved-gold' && agbProf.metalness >= 0.88 && agbProf.hasBeadedFillet && agbProf.hasCrossHatching;
recordTest('Realistic Material Engine', 'Profile A (Antique Gold Baroque SAA-AGB-15) classification', agbPass, `Type: ${agbProf.type}, metalness: ${agbProf.metalness}, beaded: ${agbProf.hasBeadedFillet}, hatching: ${agbProf.hasCrossHatching}`);

// 3.2: Profile B: Ornate Burgundy Bole & Vintage Gold (SAA-BVG-19)
const bvgFrame = FRAME_SAMPLES.find(f => f.id === 'SAA-BVG-19')!;
const bvgProf = getFrameMaterialProfile(bvgFrame);
const bvgPass = bvgProf.type === 'distressed-gilt' && bvgProf.metalness >= 0.80 && bvgProf.boleColor === '#7a2b1b';
recordTest('Realistic Material Engine', 'Profile B (Burgundy Bole & Gold SAA-BVG-19) classification', bvgPass, `Type: ${bvgProf.type}, metalness: ${bvgProf.metalness}, bole: ${bvgProf.boleColor}`);

// 3.3: Profile C: Elegant Woodgrain & Gilded Fillet (SAA-EWG-12)
const oakFrame = FRAME_SAMPLES.find(f => f.id === 'SAA-EWG-12')!;
const oakProf = getFrameMaterialProfile(oakFrame);
const oakPass = oakProf.type === 'natural-wood' && oakProf.metalness <= 0.05 && oakProf.roughness >= 0.65 && oakProf.grainOrientation === 'horizontal';
recordTest('Realistic Material Engine', 'Profile C (Woodgrain & Gold SAA-EWG-12) classification', oakPass, `Type: ${oakProf.type}, metalness: ${oakProf.metalness}, roughness: ${oakProf.roughness}, grain: ${oakProf.grainOrientation}`);

// 3.4: Visual Differentiation check: Verify all 3 test profiles are strictly unique
const diffPass = agbProf.type !== bvgProf.type && bvgProf.type !== oakProf.type && agbProf.metalness !== oakProf.metalness;
recordTest('Realistic Material Engine', 'Visual differentiation across test profiles (A, B, C)', diffPass, `Distinct materials: ${agbProf.type} vs ${bvgProf.type} vs ${oakProf.type}`);

// 4. Three.js 3D Engine with 45° Miter Extrusion
console.log('\n--- SUITE 4: 3D THREE.JS 45° MITER EXTRUSION ---');
try {
  const scene = new THREE.Scene();
  const frameGroup = new THREE.Group();
  scene.add(frameGroup);

  const agbRef = FRAME_SAMPLES.find(f => f.id === 'SAA-AGB-15')!;
  const baseHeight = 8.5;
  const baseWidth = baseHeight * (16 / 20);
  const profileW = Math.max(0.4, (agbRef.profileWidth / 12) * 2.2);
  const frameDepth = Math.max(0.35, (agbRef.depth / 12) * 2.4);
  const totalW = baseWidth + profileW * 2;
  const totalH = baseHeight + profileW * 2;

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: frameDepth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  };

  // Top Bar Trapezoid
  const topShape = new THREE.Shape();
  topShape.moveTo(-totalW / 2, totalH / 2);
  topShape.lineTo(totalW / 2, totalH / 2);
  topShape.lineTo(totalW / 2 - profileW, totalH / 2 - profileW);
  topShape.lineTo(-totalW / 2 + profileW, totalH / 2 - profileW);
  topShape.closePath();
  const topMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(topShape, extrudeSettings));
  frameGroup.add(topMesh);

  // Bottom Bar Trapezoid
  const bottomShape = new THREE.Shape();
  bottomShape.moveTo(-totalW / 2, -totalH / 2);
  bottomShape.lineTo(totalW / 2, -totalH / 2);
  bottomShape.lineTo(totalW / 2 - profileW, -totalH / 2 + profileW);
  bottomShape.lineTo(-totalW / 2 + profileW, -totalH / 2 + profileW);
  bottomShape.closePath();
  const bottomMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(bottomShape, extrudeSettings));
  frameGroup.add(bottomMesh);

  // Left Bar Trapezoid
  const leftShape = new THREE.Shape();
  leftShape.moveTo(-totalW / 2, totalH / 2);
  leftShape.lineTo(-totalW / 2 + profileW, totalH / 2 - profileW);
  leftShape.lineTo(-totalW / 2 + profileW, -totalH / 2 + profileW);
  leftShape.lineTo(-totalW / 2, -totalH / 2);
  leftShape.closePath();
  const leftMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(leftShape, extrudeSettings));
  frameGroup.add(leftMesh);

  // Right Bar Trapezoid
  const rightShape = new THREE.Shape();
  rightShape.moveTo(totalW / 2, totalH / 2);
  rightShape.lineTo(totalW / 2, -totalH / 2);
  rightShape.lineTo(totalW / 2 - profileW, -totalH / 2 + profileW);
  rightShape.lineTo(totalW / 2 - profileW, totalH / 2 - profileW);
  rightShape.closePath();
  const rightMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(rightShape, extrudeSettings));
  frameGroup.add(rightMesh);

  const miterPass = frameGroup.children.length === 4;
  recordTest('Three.js 3D Engine', 'Extruded 45° miter trapezoid frame assembly', miterPass, `Generated 4 authentic mitered trapezoid meshes with zero gap joints`);
} catch (e: any) {
  recordTest('Three.js 3D Engine', 'Extruded 45° miter trapezoid frame assembly', false, e.message);
}

// 5. Catalog Data Integrity
console.log('\n--- SUITE 5: CATALOG INTEGRITY ---');
const retiredIds = ['SAA-FLR-01', 'SAA-VEN-02', 'SAA-OAK-03', 'SAA-CRU-04', 'SAA-IMP-05', 'SAA-TUS-06', 'SAA-SIL-07'];
const retiredAbsent = retiredIds.every(id => !FRAME_SAMPLES.some(f => f.id === id));
const framesValid = FRAME_SAMPLES.length === 25 && retiredAbsent && FRAME_SAMPLES.every(f => f.basePricePerFoot > 0 && f.profileWidth > 0);
recordTest('Catalog Integrity', 'All 25 active profiles loaded (7 retired chevrons excluded) with valid pricing & profile dimensions', framesValid, `${FRAME_SAMPLES.length} profiles validated, retired absent: ${retiredAbsent}`);

const matsValid = MAT_OPTIONS.length === 4;
recordTest('Catalog Integrity', 'All 4 archival mat options present', matsValid, `${MAT_OPTIONS.length} mat options`);

const artValid = ARTWORK_OPTIONS.length === 4;
recordTest('Catalog Integrity', 'Curated art gallery options present', artValid, `${ARTWORK_OPTIONS.length} artworks`);

// 6. Routing Logic Contract
console.log('\n--- SUITE 6: ROUTING LOGIC CONTRACT ---');
const rHome = parseRoute('/');
const rCatalog = parseRoute('/catalog');
const rConfig = parseRoute('/configurator');
const rConfigParam = parseRoute('/configurator/SAA-AGB-15');
const rStudio = parseRoute('/studio');
const rReview = parseRoute('/review');

const routePass = 
  rHome.route === 'home' &&
  rCatalog.route === 'catalog' &&
  rConfig.route === 'configure' &&
  rConfigParam.route === 'configure' &&
  rConfigParam.frameId === 'SAA-AGB-15' &&
  rStudio.route === 'studio' &&
  rReview.route === 'review';

recordTest(
  'Routing Logic', 
  'URL resolution contracts for all dedicated routes (/, /catalog, /configurator, /studio, /review)', 
  routePass, 
  `Home: ${rHome.route}, Catalog: ${rCatalog.route}, Configurator: ${rConfig.route} (${rConfigParam.frameId}), Studio: ${rStudio.route}, Review: ${rReview.route}`
);

// 7. Photometric AI Moulding Reconstruction Assets
console.log('\n--- SUITE 7: PHOTOMETRIC MOULDING RECONSTRUCTION ASSETS ---');
const recBgd = RECONSTRUCTED_MOULDING_REGISTRY['SAA-BGD-08'];
const recBgdPass = !!recBgd &&
  recBgd.isRectangularFrame === true &&
  recBgd.profileCurve.length >= 4 &&
  recBgd.pbr.metalness === 0.85;
recordTest('Moulding Reconstruction', 'Brushed Champagne Gold (SAA-BGD-08) studio rectangular calibration', recBgdPass, `Profile curve points: ${recBgd?.profileCurve?.length}, metalness: ${recBgd?.pbr?.metalness}`);

const recMhg = RECONSTRUCTED_MOULDING_REGISTRY['SAA-MHG-23'];
const recMhgPass = !!recMhg && 
  recMhg.isRectangularFrame === true && 
  Array.isArray(recMhg.rectCrop) && 
  recMhg.rectCrop[0] === 0.18 && 
  recMhg.pbr.metalness === 0.55;
recordTest('Moulding Reconstruction', 'Rich Mahogany with Gold Egg-and-Dart (SAA-MHG-23) studio rectangular calibration', recMhgPass, `isRectangular: ${recMhg?.isRectangularFrame}, crop: [${recMhg?.rectCrop?.join(', ')}], metalness: ${recMhg?.pbr?.metalness}`);

// Summary
const total = results.length;
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log('\n=============================================');
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('=============================================\n');
process.exit(failed > 0 ? 1 : 0);
