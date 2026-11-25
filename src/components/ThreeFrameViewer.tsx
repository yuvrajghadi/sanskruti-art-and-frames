import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FrameSample, MatOption, ArtworkOption, DimensionUnit, ArtworkFitMode } from '../types';
import { getFrameMaterialProfile, generateProceduralFrameCanvas } from '../utils/frameRendering';
import { reconstructMouldingTextures } from '../utils/mouldingReconstruction';

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

  // Update camera angle preset
  useEffect(() => {
    if (!cameraRef.current || !frameGroupRef.current) return;

    switch (cameraPreset) {
      case 'corner': // Macro Corner Miter (45°)
        cameraRef.current.position.set(5.5, 5.5, 9.5);
        cameraRef.current.lookAt(new THREE.Vector3(2.5, 2.5, 0));
        frameGroupRef.current.rotation.set(0.1, -0.35, 0);
        break;
      case 'front': // Full Frontal Elevation
        cameraRef.current.position.set(0, 0, 16);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
        frameGroupRef.current.rotation.set(0, 0, 0);
        break;
      case 'cross-section': // CAD Profile Cross-section
        cameraRef.current.position.set(12, 0, 4);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
        frameGroupRef.current.rotation.set(0, 1.2, 0);
        break;
      case 'perspective': // Wall Eye-Level Perspective
        cameraRef.current.position.set(-4, -1, 14);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
        frameGroupRef.current.rotation.set(-0.08, 0.25, 0);
        break;
    }
  }, [cameraPreset]);

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
      rendererRef.current = renderer;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // LIGHTING RIG
      const ambientLight = new THREE.AmbientLight(0xffecc7, 1.4);
      ambientLightRef.current = ambientLight;
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xfff1d6, 3.0);
      keyLight.position.set(8, 12, 14);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLightRef.current = keyLight;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0xf4d399, 1.8);
      rimLight.position.set(-10, -6, 8);
      rimLightRef.current = rimLight;
      scene.add(rimLight);

      const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
      topLight.position.set(0, 15, 2);
      scene.add(topLight);

      // BUILD 3D FRAME MODEL
      const frameGroup = new THREE.Group();
      frameGroupRef.current = frameGroup;
      scene.add(frameGroup);

      // Normalization of dimensions
      const wInches = unit === 'cm' ? width / 2.54 : width;
      const hInches = unit === 'cm' ? height / 2.54 : height;
      const aspect = wInches / hInches;

      const baseHeight = 8.5;
      const baseWidth = baseHeight * aspect;
      const profileW = Math.max(0.4, (frame.profileWidth / 12) * 2.2);
      const frameDepth = Math.max(0.35, (frame.depth / 12) * 2.4);
      const matW = mat.id === 'mat-none' ? 0 : Math.max(0.3, (mat.borderWidth / 12) * 2.0);

      const totalW = baseWidth + (profileW + matW) * 2;
      const totalH = baseHeight + (profileW + matW) * 2;

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

      // Photometric AI Reconstruction: Extract pure rectified molding from original photograph
      let isMounted = true;
      let leftMeshRef: THREE.Mesh | null = null;
      let rightMeshRef: THREE.Mesh | null = null;

      reconstructMouldingTextures(frame).then(({ diffuseCanvas, normalCanvas, roughnessCanvas }) => {
        if (!isMounted) return;
        const diffTex = new THREE.CanvasTexture(diffuseCanvas);
        diffTex.wrapS = THREE.RepeatWrapping;
        diffTex.wrapT = THREE.ClampToEdgeWrapping;
        diffTex.colorSpace = THREE.SRGBColorSpace;
        diffTex.repeat.set(Math.max(1, Math.round(totalW / (profileW * 1.5))), 1);

        const normTex = new THREE.CanvasTexture(normalCanvas);
        normTex.wrapS = THREE.RepeatWrapping;
        normTex.wrapT = THREE.ClampToEdgeWrapping;
        normTex.repeat.copy(diffTex.repeat);

        const roughTex = new THREE.CanvasTexture(roughnessCanvas);
        roughTex.wrapS = THREE.RepeatWrapping;
        roughTex.wrapT = THREE.ClampToEdgeWrapping;
        roughTex.repeat.copy(diffTex.repeat);

        moldingMaterial.map = diffTex;
        moldingMaterial.normalMap = normTex;
        moldingMaterial.normalScale.set(1.5, 1.5);
        moldingMaterial.roughnessMap = roughTex;
        moldingMaterial.needsUpdate = true;

        if (leftMeshRef && rightMeshRef) {
          const diffTexV = new THREE.CanvasTexture(diffuseCanvas);
          diffTexV.wrapS = THREE.RepeatWrapping;
          diffTexV.wrapT = THREE.ClampToEdgeWrapping;
          diffTexV.colorSpace = THREE.SRGBColorSpace;
          diffTexV.repeat.set(Math.max(1, Math.round(totalH / (profileW * 1.5))), 1);

          const normTexV = new THREE.CanvasTexture(normalCanvas);
          normTexV.wrapS = THREE.RepeatWrapping;
          normTexV.wrapT = THREE.ClampToEdgeWrapping;
          normTexV.repeat.copy(diffTexV.repeat);

          const roughTexV = new THREE.CanvasTexture(roughnessCanvas);
          roughTexV.wrapS = THREE.RepeatWrapping;
          roughTexV.wrapT = THREE.ClampToEdgeWrapping;
          roughTexV.repeat.copy(diffTexV.repeat);

          const verticalMaterial = moldingMaterial.clone();
          verticalMaterial.map = diffTexV;
          verticalMaterial.normalMap = normTexV;
          verticalMaterial.roughnessMap = roughTexV;
          verticalMaterial.needsUpdate = true;

          leftMeshRef.material = verticalMaterial;
          rightMeshRef.material = verticalMaterial;
        }
      }).catch((err) => {
        console.warn('Photometric reconstruction fallback:', err);
      });

      // Extrude 4 authentic 45-degree mitered trapezoidal bars
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: frameDepth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: Math.min(0.04, profileW * 0.04),
        bevelThickness: Math.min(0.04, frameDepth * 0.05),
      };

      // 1. Top Bar Miter Trapezoid
      const topShape = new THREE.Shape();
      topShape.moveTo(-totalW / 2, totalH / 2);
      topShape.lineTo(totalW / 2, totalH / 2);
      topShape.lineTo(totalW / 2 - profileW, totalH / 2 - profileW);
      topShape.lineTo(-totalW / 2 + profileW, totalH / 2 - profileW);
      topShape.closePath();
      const topGeo = new THREE.ExtrudeGeometry(topShape, extrudeSettings);
      const topMesh = new THREE.Mesh(topGeo, moldingMaterial);
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      frameGroup.add(topMesh);

      // 2. Bottom Bar Miter Trapezoid
      const bottomShape = new THREE.Shape();
      bottomShape.moveTo(-totalW / 2, -totalH / 2);
      bottomShape.lineTo(totalW / 2, -totalH / 2);
      bottomShape.lineTo(totalW / 2 - profileW, -totalH / 2 + profileW);
      bottomShape.lineTo(-totalW / 2 + profileW, -totalH / 2 + profileW);
      bottomShape.closePath();
      const bottomGeo = new THREE.ExtrudeGeometry(bottomShape, extrudeSettings);
      const bottomMesh = new THREE.Mesh(bottomGeo, moldingMaterial);
      bottomMesh.castShadow = true;
      bottomMesh.receiveShadow = true;
      frameGroup.add(bottomMesh);

      // 3. Left Bar Miter Trapezoid
      const leftShape = new THREE.Shape();
      leftShape.moveTo(-totalW / 2, totalH / 2);
      leftShape.lineTo(-totalW / 2 + profileW, totalH / 2 - profileW);
      leftShape.lineTo(-totalW / 2 + profileW, -totalH / 2 + profileW);
      leftShape.lineTo(-totalW / 2, -totalH / 2);
      leftShape.closePath();
      const leftGeo = new THREE.ExtrudeGeometry(leftShape, extrudeSettings);
      const leftMesh = new THREE.Mesh(leftGeo, moldingMaterial);
      leftMesh.castShadow = true;
      leftMesh.receiveShadow = true;
      leftMeshRef = leftMesh;
      frameGroup.add(leftMesh);

      // 4. Right Bar Miter Trapezoid
      const rightShape = new THREE.Shape();
      rightShape.moveTo(totalW / 2, totalH / 2);
      rightShape.lineTo(totalW / 2, -totalH / 2);
      rightShape.lineTo(totalW / 2 - profileW, -totalH / 2 + profileW);
      rightShape.lineTo(totalW / 2 - profileW, totalH / 2 - profileW);
      rightShape.closePath();
      const rightGeo = new THREE.ExtrudeGeometry(rightShape, extrudeSettings);
      const rightMesh = new THREE.Mesh(rightGeo, moldingMaterial);
      rightMesh.castShadow = true;
      rightMesh.receiveShadow = true;
      rightMeshRef = rightMesh;
      frameGroup.add(rightMesh);

      // 5. Matboard Plane
      if (matW > 0) {
        const matColor = new THREE.Color(mat.colorHex === 'transparent' ? '#FAF8F5' : mat.colorHex);
        const matMaterial = new THREE.MeshStandardMaterial({
          color: matColor,
          roughness: 0.9,
          metalness: 0.0,
        });
        const matGeo = new THREE.PlaneGeometry(totalW - profileW * 2, totalH - profileW * 2);
        const matMesh = new THREE.Mesh(matGeo, matMaterial);
        matMesh.position.set(0, 0, frameDepth * 0.35);
        matMesh.receiveShadow = true;
        frameGroup.add(matMesh);
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

          const artW = totalW - (profileW + matW) * 2;
          const artH = totalH - (profileW + matW) * 2;
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
            roughness: 0.35,
            metalness: 0.05,
          });
          const artGeo = new THREE.PlaneGeometry(artW, artH);
          const artMesh = new THREE.Mesh(artGeo, artMaterial);
          artMesh.position.set(0, 0, frameDepth * 0.32);
          artMesh.receiveShadow = true;
          frameGroup.add(artMesh);
        },
        undefined,
        () => {
          if (!isMounted) return;
          // Fallback artwork plane
          const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x3d3120, roughness: 0.8 });
          const artW = totalW - (profileW + matW) * 2;
          const artH = totalH - (profileW + matW) * 2;
          const artGeo = new THREE.PlaneGeometry(artW, artH);
          const artMesh = new THREE.Mesh(artGeo, fallbackMat);
          artMesh.position.set(0, 0, frameDepth * 0.32);
          frameGroup.add(artMesh);
        }
      );

      // Initial orientation: angled for corner appreciation
      frameGroup.rotation.y = -0.3;
      frameGroup.rotation.x = 0.1;

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
          cameraRef.current.position.z = Math.max(5, Math.min(25, cameraRef.current.position.z + delta));
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
        cameraRef.current.position.z = Math.max(
          5,
          Math.min(25, cameraRef.current.position.z + e.deltaY * 0.015)
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
        const h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
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
    <div className="relative w-full h-full min-h-[460px] flex items-center justify-center cursor-grab active:cursor-grabbing">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
