import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FrameSample, MatOption, ArtworkOption, DimensionUnit, ArtworkFitMode } from '../types';
import { getFrameMaterialProfile, generateProceduralFrameCanvas } from '../utils/frameRendering';
import { reconstructMouldingTextures, RECONSTRUCTED_MOULDING_REGISTRY } from '../utils/mouldingReconstruction';
import { computePhysicalMetrics, buildCrossSectionLoop, buildMiteredRailBuffers, FrameSide } from '../utils/frameGeometry';

export type LightingEnv = '3000k' | '5500k' | '2400k' | 'studio';
export type CameraAngle = 'corner' | 'front' | 'cross-section' | 'perspective';
export type PatinaMode = 'pristine' | 'antiqued' | 'aged';

interface ThreeFrameViewerProps {
  frame: FrameSample;
  width: number;
  height: number;
  unit: DimensionUnit;
  mat: MatOption;
  artwork: ArtworkOption;
  customArtUrl?: string | null;
  artworkFit?: ArtworkFitMode;
  lighting?: LightingEnv;
  cameraPreset?: CameraAngle;
  patina?: PatinaMode;
  isAutoRotate?: boolean;
}

/**
 * Helper to recursively dispose Three.js meshes, geometries, materials, and textures.
 */
function disposeThreeNode(node: THREE.Object3D) {
  for (let i = node.children.length - 1; i >= 0; i--) {
    disposeThreeNode(node.children[i]);
  }
  if (node instanceof THREE.Mesh) {
    if (node.geometry) {
      node.geometry.dispose();
    }
    if (node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach(disposeThreeMaterial);
      } else {
        disposeThreeMaterial(node.material);
      }
    }
  }
}

function disposeThreeMaterial(mat: THREE.Material) {
  const m = mat as unknown as Record<string, unknown>;
  for (const key of Object.keys(m)) {
    const val = m[key];
    if (val && typeof val === 'object' && 'isTexture' in val && (val as { isTexture: boolean }).isTexture) {
      (val as THREE.Texture).dispose();
    }
  }
  mat.dispose();
}

export const ThreeFrameViewer: React.FC<ThreeFrameViewerProps> = ({
  frame,
  width,
  height,
  unit,
  mat,
  artwork,
  customArtUrl,
  artworkFit = 'fill',
  lighting = '3000k',
  cameraPreset = 'corner',
  patina = 'pristine',
  isAutoRotate = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameGroupRef = useRef<THREE.Group | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);

  const isDraggingRef = useRef(false);
  const previousPointerPositionRef = useRef({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);

  const boundsRef = useRef<{ totalW: number; totalH: number; frameDepth: number }>({
    totalW: 10,
    totalH: 10,
    frameDepth: 0.5,
  });
  const cameraPresetRef = useRef<CameraAngle>(cameraPreset);
  const isAutoRotateRef = useRef<boolean>(isAutoRotate);
  const baseFitDistanceRef = useRef<number>(18);
  const fitCameraRef = useRef<(() => void) | null>(null);

  cameraPresetRef.current = cameraPreset;
  isAutoRotateRef.current = isAutoRotate;

  const activeArtUrl = customArtUrl || artwork.imageUrl;

  // Update lighting rig based on temperature preset
  useEffect(() => {
    if (!keyLightRef.current || !ambientLightRef.current || !rimLightRef.current) return;

    switch (lighting) {
      case '3000k': // Museum Halogen (Warm)
        ambientLightRef.current.color.setHex(0xffecc7);
        ambientLightRef.current.intensity = 1.3;
        keyLightRef.current.color.setHex(0xfff1d6);
        keyLightRef.current.intensity = 3.0;
        rimLightRef.current.color.setHex(0xf4d399);
        rimLightRef.current.intensity = 1.8;
        break;
      case '5500k': // Daylight Gallery (Cool neutral)
        ambientLightRef.current.color.setHex(0xf0f5ff);
        ambientLightRef.current.intensity = 1.5;
        keyLightRef.current.color.setHex(0xffffff);
        keyLightRef.current.intensity = 2.8;
        rimLightRef.current.color.setHex(0xdde9ff);
        rimLightRef.current.intensity = 1.5;
        break;
      case '2400k': // Candlelight / Antique (Deep warm amber)
        ambientLightRef.current.color.setHex(0xffd58f);
        ambientLightRef.current.intensity = 1.6;
        keyLightRef.current.color.setHex(0xffbd59);
        keyLightRef.current.intensity = 3.5;
        rimLightRef.current.color.setHex(0xffaa3b);
        rimLightRef.current.intensity = 2.2;
        break;
      case 'studio': // Neutral Studio 5000K
      default:
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 1.4;
        keyLightRef.current.color.setHex(0xffffff);
        keyLightRef.current.intensity = 2.6;
        rimLightRef.current.color.setHex(0xe8eef5);
        rimLightRef.current.intensity = 1.4;
        break;
    }
  }, [lighting]);

  // Update camera angle preset and adapt framing to container + frame dimensions
  useEffect(() => {
    fitCameraRef.current?.();
  }, [cameraPreset, isAutoRotate]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const containerWidth = container.clientWidth || 600;
    const containerHeight = container.clientHeight || 500;

    let animationFrameId: number;

    try {
      // SCENE
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // CAMERA
      const camera = new THREE.PerspectiveCamera(
        42,
        containerWidth / containerHeight,
        0.1,
        1000
      );
      camera.position.set(5.5, 5.5, 11);
      cameraRef.current = camera;

      // RENDERER
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(containerWidth, containerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      rendererRef.current = renderer;

      // Procedural studio IBL environment so high-metalness gold/silver mouldings render with authentic luster
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();
      pmremGenerator.dispose();

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // LIGHTING RIG
      const ambientLight = new THREE.AmbientLight(0xffecc7, 1.4);
      ambientLightRef.current = ambientLight;
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.8);
      keyLight.position.set(14, 18, 26);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0008;
      keyLightRef.current = keyLight;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xf4d399, 1.8);
      rimLight.position.set(-14, -10, 14);
      rimLightRef.current = rimLight;
      scene.add(rimLight);

      const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
      topLight.position.set(0, 20, 6);
      scene.add(topLight);

      // BUILD 3D FRAME MODEL
      const frameGroup = new THREE.Group();
      frameGroupRef.current = frameGroup;
      scene.add(frameGroup);

      // Normalization of dimensions via shared single-source-of-truth geometry (1 world unit = 1 physical inch)
      const geom = computePhysicalMetrics(frame, width, height, unit, mat);
      const profileW = geom.mouldingFaceIn;
      const frameDepth = geom.mouldingDepthIn;
      const matW = geom.matBorderIn;
      const artW = geom.artworkWidthIn;
      const artH = geom.artworkHeightIn;
      const totalW = geom.outerWidthIn;
      const totalH = geom.outerHeightIn;
      boundsRef.current = { totalW, totalH, frameDepth };

      // Fit directional light shadow frustum cleanly around full physical frame bounds (up to 36x48"+)
      const shadowHalfExtent = Math.max(totalW, totalH, 12) * 0.78;
      keyLight.shadow.camera.left = -shadowHalfExtent;
      keyLight.shadow.camera.right = shadowHalfExtent;
      keyLight.shadow.camera.top = shadowHalfExtent;
      keyLight.shadow.camera.bottom = -shadowHalfExtent;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = Math.max(120, shadowHalfExtent * 6);
      keyLight.shadow.camera.updateProjectionMatrix();

      // Dynamic aspect-aware camera distance fitting entire outer frame within container frustum
      const applyFitCamera = () => {
        const cam = cameraRef.current;
        const grp = frameGroupRef.current;
        const cont = mountRef.current;
        if (!cam || !grp || !cont) return;

        const cw = cont.clientWidth || 600;
        const ch = cont.clientHeight || 460;
        const aspectRatio = Math.max(0.25, cw / Math.max(1, ch));
        cam.aspect = aspectRatio;

        const { totalW: bw, totalH: bh, frameDepth: bd } = boundsRef.current;
        const preset = cameraPresetRef.current;
        const autoRot = isAutoRotateRef.current;

        let rotX = 0;
        let rotY = 0;
        let camDirX = 0;
        let camDirY = 0;
        let camDirZ = 1;

        switch (preset) {
          case 'front':
            rotX = 0;
            rotY = 0;
            camDirX = 0;
            camDirY = 0;
            camDirZ = 1;
            break;
          case 'cross-section':
            rotX = 0.08;
            rotY = 0.96;
            camDirX = 0.22;
            camDirY = 0.08;
            camDirZ = 0.97;
            break;
          case 'perspective':
            rotX = -0.08;
            rotY = 0.28;
            camDirX = -0.18;
            camDirY = -0.05;
            camDirZ = 0.98;
            break;
          case 'corner':
          default:
            rotX = 0.14;
            rotY = -0.34;
            camDirX = 0.22;
            camDirY = 0.16;
            camDirZ = 0.96;
            break;
        }

        grp.rotation.set(rotX, rotY, 0);

        const vFovRad = (cam.fov * Math.PI) / 180;
        const tanHalfV = Math.tan(vFovRad / 2);
        const tanHalfH = tanHalfV * aspectRatio;

        // Account for preset rotation and 360-degree yaw radius when auto-rotating
        const effW = autoRot
          ? Math.hypot(bw, bd)
          : Math.abs(bw * Math.cos(rotY)) + Math.abs(bd * Math.sin(rotY));
        const projDepth = autoRot
          ? Math.hypot(bw, bd)
          : Math.abs(bw * Math.sin(rotY)) + Math.abs(bd * Math.cos(rotY));
        const effH = Math.abs(bh * Math.cos(rotX)) + Math.abs(projDepth * Math.sin(rotX));
        const halfDepth = Math.max(projDepth, bd) * 0.5;

        const distV = (effH * 0.5) / tanHalfV + halfDepth;
        const distH = (effW * 0.5) / tanHalfH + halfDepth;
        const fitDist = Math.max(distV, distH) * 1.24;
        baseFitDistanceRef.current = fitDist;

        const targetZ = bd * 0.35;
        const normLen = Math.hypot(camDirX, camDirY, camDirZ) || 1;
        cam.position.set(
          (camDirX / normLen) * fitDist,
          (camDirY / normLen) * fitDist,
          targetZ + (camDirZ / normLen) * fitDist
        );
        cam.near = Math.max(0.1, fitDist * 0.05);
        cam.far = Math.max(1000, fitDist * 10);
        cam.lookAt(new THREE.Vector3(0, 0, targetZ));
        cam.updateProjectionMatrix();
      };
      fitCameraRef.current = applyFitCamera;

      // Compute physical material telemetry based on frame profile
      const profile = getFrameMaterialProfile(frame);

      let roughness = profile.roughness;
      let metalness = profile.metalness;

      if (patina === 'antiqued') {
        roughness = Math.min(0.95, roughness * 1.35);
        metalness = Math.max(0.05, metalness * 0.85);
      } else if (patina === 'aged') {
        roughness = Math.min(0.98, roughness * 1.6);
        metalness = Math.max(0.02, metalness * 0.7);
      }

      // Generate procedural bump canvas texture for authentic surface tactile depth
      const bumpCanvas = generateProceduralFrameCanvas(frame, 'bump', 512, 512);
      const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
      bumpTexture.wrapS = THREE.RepeatWrapping;
      bumpTexture.wrapT = THREE.RepeatWrapping;
      bumpTexture.repeat.set(2, 2);

      const moldingMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(profile.baseColor),
        roughness,
        metalness,
        bumpMap: bumpTexture,
        bumpScale: profile.bumpScale,
      });

      // Photometric Reconstruction: Extract rectified seamless strips mapped identically via UVs on all 4 rails
      let isMounted = true;

      reconstructMouldingTextures(frame, { highDpi: true }).then(({ diffuseCanvas, normalCanvas, roughnessCanvas }) => {
        if (!isMounted) return;
        const diffTex = new THREE.CanvasTexture(diffuseCanvas);
        diffTex.wrapS = THREE.RepeatWrapping;
        diffTex.wrapT = THREE.ClampToEdgeWrapping;
        diffTex.colorSpace = THREE.SRGBColorSpace;
        diffTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        // Physical periodicity (3.5 * faceWidth) is baked directly into mesh UVs so all 4 rails share repeat(1, 1)
        diffTex.repeat.set(1, 1);

        const normTex = new THREE.CanvasTexture(normalCanvas);
        normTex.wrapS = THREE.RepeatWrapping;
        normTex.wrapT = THREE.ClampToEdgeWrapping;
        normTex.repeat.set(1, 1);

        const roughTex = new THREE.CanvasTexture(roughnessCanvas);
        roughTex.wrapS = THREE.RepeatWrapping;
        roughTex.wrapT = THREE.ClampToEdgeWrapping;
        roughTex.repeat.set(1, 1);

        moldingMaterial.color.setHex(
          patina === 'aged' ? 0xd9cfb8 : patina === 'antiqued' ? 0xebe3d2 : 0xffffff
        );
        moldingMaterial.map = diffTex;
        moldingMaterial.normalMap = normTex;
        moldingMaterial.normalScale.set(1.35, 1.35);
        moldingMaterial.roughnessMap = roughTex;
        moldingMaterial.needsUpdate = true;
      }).catch((err) => {
        console.warn('Photometric reconstruction fallback:', err);
      });

      // Build 4 symmetrical contoured 45-degree mitered rails from reconstructed cross-section curve
      const asset = RECONSTRUCTED_MOULDING_REGISTRY[frame.id];
      const section = buildCrossSectionLoop(
        profileW,
        frameDepth,
        asset?.profileCurve,
        asset?.rabbetDepth
      );

      for (const side of ['top', 'bottom', 'left', 'right'] as FrameSide[]) {
        const railBuf = buildMiteredRailBuffers(side, geom, section);
        const railGeo = new THREE.BufferGeometry();
        railGeo.setAttribute('position', new THREE.BufferAttribute(railBuf.positions, 3));
        railGeo.setAttribute('normal', new THREE.BufferAttribute(railBuf.normals, 3));
        railGeo.setAttribute('uv', new THREE.BufferAttribute(railBuf.uvs, 2));
        railGeo.setIndex(new THREE.BufferAttribute(railBuf.indices, 1));

        const railMesh = new THREE.Mesh(railGeo, moldingMaterial);
        railMesh.name = `frame-rail-${side}`;
        railMesh.castShadow = true;
        railMesh.receiveShadow = true;
        frameGroup.add(railMesh);
      }

      // Layer ordering (Z=0 frame back -> backing -> artwork -> perforated matboard aperture)
      const backingZ = Math.max(0.02, frameDepth * 0.08);
      const artZ = Math.max(backingZ + 0.04, frameDepth * 0.24);
      const backingMat = new THREE.MeshStandardMaterial({
        color: 0x1c1815,
        roughness: 0.95,
        metalness: 0.0,
      });
      const backingGeo = new THREE.PlaneGeometry(geom.innerWidthIn + 0.08, geom.innerHeightIn + 0.08);
      const backingMesh = new THREE.Mesh(backingGeo, backingMat);
      backingMesh.position.set(0, 0, backingZ);
      frameGroup.add(backingMesh);

      // 5. Genuine Matboard with Rectangular Aperture Hole (never occludes artwork)
      if (matW > 0) {
        const matColor = new THREE.Color(mat.colorHex === 'transparent' ? '#FAF8F5' : mat.colorHex);
        const matMaterial = new THREE.MeshStandardMaterial({
          color: matColor,
          roughness: 0.9,
          metalness: 0.0,
        });

        const overhang = Math.min(0.05, profileW * 0.05);
        const outerHalfW = geom.halfInnerW + overhang;
        const outerHalfH = geom.halfInnerH + overhang;
        const matShape = new THREE.Shape();
        matShape.moveTo(-outerHalfW, -outerHalfH);
        matShape.lineTo(outerHalfW, -outerHalfH);
        matShape.lineTo(outerHalfW, outerHalfH);
        matShape.lineTo(-outerHalfW, outerHalfH);
        matShape.closePath();

        const holePath = new THREE.Path();
        holePath.moveTo(-geom.halfArtW, -geom.halfArtH);
        holePath.lineTo(-geom.halfArtW, geom.halfArtH);
        holePath.lineTo(geom.halfArtW, geom.halfArtH);
        holePath.lineTo(geom.halfArtW, -geom.halfArtH);
        holePath.closePath();
        matShape.holes.push(holePath);

        const matThickness = Math.max(0.02, Math.min(0.075, frameDepth * 0.055));
        const bevelW = Math.min(0.055, matW * 0.08);
        const matGeo = new THREE.ExtrudeGeometry(matShape, {
          depth: matThickness,
          bevelEnabled: false,
        });
        const matMesh = new THREE.Mesh(matGeo, matMaterial);
        matMesh.name = 'matboard-aperture';
        matMesh.position.set(0, 0, artZ + 0.015);
        matMesh.castShadow = true;
        matMesh.receiveShadow = true;
        frameGroup.add(matMesh);

        // Clean 45° archival core bevel trim around the inner aperture opening
        const bevelShape = new THREE.Shape();
        bevelShape.moveTo(-geom.halfArtW - bevelW, -geom.halfArtH - bevelW);
        bevelShape.lineTo(geom.halfArtW + bevelW, -geom.halfArtH - bevelW);
        bevelShape.lineTo(geom.halfArtW + bevelW, geom.halfArtH + bevelW);
        bevelShape.lineTo(-geom.halfArtW - bevelW, geom.halfArtH + bevelW);
        bevelShape.closePath();
        const bevelHole = new THREE.Path();
        bevelHole.moveTo(-geom.halfArtW, -geom.halfArtH);
        bevelHole.lineTo(-geom.halfArtW, geom.halfArtH);
        bevelHole.lineTo(geom.halfArtW, geom.halfArtH);
        bevelHole.lineTo(geom.halfArtW, -geom.halfArtH);
        bevelHole.closePath();
        bevelShape.holes.push(bevelHole);
        const bevelGeo = new THREE.ExtrudeGeometry(bevelShape, {
          depth: Math.max(0.01, matThickness * 0.65),
          bevelEnabled: false,
        });
        const bevelMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(mat.coreHex || '#FAF8F5'),
          roughness: 0.85,
          metalness: 0.0,
        });
        const bevelMesh = new THREE.Mesh(bevelGeo, bevelMat);
        bevelMesh.position.set(0, 0, artZ + 0.008);
        frameGroup.add(bevelMesh);
      }

      // 6. Artwork Canvas Texture with Aspect-Preserving Fit vs Fill
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        activeArtUrl,
        (artTexture) => {
          if (!isMounted) {
            artTexture.dispose();
            return;
          }
          artTexture.colorSpace = THREE.SRGBColorSpace;
          artTexture.wrapS = THREE.ClampToEdgeWrapping;
          artTexture.wrapT = THREE.ClampToEdgeWrapping;

          const cavityAspect = artW / artH;
          const artAspect = artwork.aspectRatio || 1.0;

          // Aspect-ratio correction to prevent stretching
          if (artworkFit === 'fit') {
            if (artAspect > cavityAspect) {
              const scale = cavityAspect / artAspect;
              artTexture.repeat.set(1, scale);
              artTexture.offset.set(0, (1 - scale) / 2);
            } else {
              const scale = artAspect / cavityAspect;
              artTexture.repeat.set(scale, 1);
              artTexture.offset.set((1 - scale) / 2, 0);
            }
          } else {
            // Fill mode (cover cavity, centered)
            if (artAspect > cavityAspect) {
              const scale = cavityAspect / artAspect;
              artTexture.repeat.set(scale, 1);
              artTexture.offset.set((1 - scale) / 2, 0);
            } else {
              const scale = artAspect / cavityAspect;
              artTexture.repeat.set(1, scale);
              artTexture.offset.set(0, (1 - scale) / 2);
            }
          }

          const artMaterial = new THREE.MeshStandardMaterial({
            map: artTexture,
            roughness: 0.42,
            metalness: 0.04,
          });
          const artGeo = new THREE.PlaneGeometry(artW, artH);
          const artMesh = new THREE.Mesh(artGeo, artMaterial);
          artMesh.name = 'artwork-plane';
          artMesh.position.set(0, 0, artZ);
          artMesh.receiveShadow = true;
          frameGroup.add(artMesh);
        },
        undefined,
        () => {
          if (!isMounted) return;
          const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x3d3120, roughness: 0.8 });
          const artGeo = new THREE.PlaneGeometry(artW, artH);
          const artMesh = new THREE.Mesh(artGeo, fallbackMat);
          artMesh.name = 'artwork-plane';
          artMesh.position.set(0, 0, artZ);
          frameGroup.add(artMesh);
        }
      );

      // Fit camera immediately on mount / geometry rebuild
      applyFitCamera();

      // Mouse drag handlers for manual orbiting
      const handleMouseDown = (e: MouseEvent) => {
        isDraggingRef.current = true;
        previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !frameGroupRef.current) return;
        const deltaX = e.clientX - previousPointerPositionRef.current.x;
        const deltaY = e.clientY - previousPointerPositionRef.current.y;

        frameGroupRef.current.rotation.y += deltaX * 0.008;
        frameGroupRef.current.rotation.x += deltaY * 0.008;

        previousPointerPositionRef.current = { x: e.clientX, y: e.clientY };
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
      };

      // Touch handlers for mobile orbit and pinch-zoom
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDraggingRef.current = true;
          previousPointerPositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          initialPinchDistanceRef.current = Math.hypot(dx, dy);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!frameGroupRef.current) return;
        if (e.touches.length === 1 && isDraggingRef.current) {
          const deltaX = e.touches[0].clientX - previousPointerPositionRef.current.x;
          const deltaY = e.touches[0].clientY - previousPointerPositionRef.current.y;
          frameGroupRef.current.rotation.y += deltaX * 0.008;
          frameGroupRef.current.rotation.x += deltaY * 0.008;
          previousPointerPositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2 && initialPinchDistanceRef.current !== null && cameraRef.current) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const delta = (initialPinchDistanceRef.current - dist) * 0.04;
          const minZoom = Math.max(4, baseFitDistanceRef.current * 0.45);
          const maxZoom = Math.max(45, baseFitDistanceRef.current * 2.5);
          cameraRef.current.position.z = Math.max(minZoom, Math.min(maxZoom, cameraRef.current.position.z + delta));
          initialPinchDistanceRef.current = dist;
        }
      };

      const handleTouchEnd = () => {
        isDraggingRef.current = false;
        initialPinchDistanceRef.current = null;
      };

      const domElement = renderer.domElement;
      domElement.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);

      // Wheel handler for smooth zooming
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!cameraRef.current) return;
        const minZoom = Math.max(4, baseFitDistanceRef.current * 0.45);
        const maxZoom = Math.max(45, baseFitDistanceRef.current * 2.5);
        cameraRef.current.position.z = Math.max(
          minZoom,
          Math.min(maxZoom, cameraRef.current.position.z + e.deltaY * 0.015)
        );
      };
      domElement.addEventListener('wheel', handleWheel, { passive: false });

      // ANIMATION LOOP
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        if (isAutoRotate && !isDraggingRef.current && frameGroupRef.current) {
          frameGroupRef.current.rotation.y += 0.0025;
        }

        renderer.render(scene, camera);
      };
      animate();

      // Responsive container ResizeObserver with window fallback
      const handleResize = () => {
        if (!container || !camera || !renderer) return;
        const w = container.clientWidth || 600;
        const h = container.clientHeight || 460;
        renderer.setSize(w, h);
        applyFitCamera();
      };

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);
      } else {
        window.addEventListener('resize', handleResize);
      }

      return () => {
        isMounted = false;
        cancelAnimationFrame(animationFrameId);

        if (resizeObserver) {
          resizeObserver.disconnect();
        } else {
          window.removeEventListener('resize', handleResize);
        }

        domElement.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        domElement.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        domElement.removeEventListener('wheel', handleWheel);

        // Exhaustive Three.js GPU resource disposal
        fitCameraRef.current = null;
        scene.environment = null;
        envRT.dispose();
        disposeThreeNode(scene);
        renderer.dispose();

        if (container.contains(domElement)) {
          container.removeChild(domElement);
        }
      };
    } catch (err) {
      console.error('Three.js initialization failed:', err);
    }
  }, [frame, width, height, unit, mat, activeArtUrl, artworkFit, isAutoRotate, patina]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
