"use client";

import React, { useRef, useEffect, useState, memo } from "react";
import { THREE } from "@/lib/three";
import {
  OfficeTilemap,
  getZoneAt,
  findPath,
  InteractiveObject,
} from "@/lib/space/officeMap";
import { PeerState } from "@/lib/space/signaling";
import {
  ScreenPosition,
  screenPositionsStore,
} from "@/lib/space/screenPositionsStore";
import { OFFICE_THEMES, OfficeTheme } from "@/lib/space/officeThemes";
import { IconCompass, IconZoomIn, IconZoomOut } from "@/components/space/SpaceIcons";

interface Space3DCanvasProps {
  map: OfficeTilemap;
  localPeer: PeerState;
  remotePeers: PeerState[];
  speakingMap: Record<string, boolean>;
  theme?: OfficeTheme;
  onMove: (x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string) => void;
  onInteract: (obj: InteractiveObject) => void;
  onScreenPositionUpdate?: (positions: Record<string, ScreenPosition>) => void;
}

interface AvatarRig {
  group: any;
  body: any;
  head: any;
  hair: any;
  visor: any;
  ring: any;
  color: string;
  targetX: number;
  targetZ: number;
  targetRot: number;
  isMoving: boolean;
}

const FLOOR_TILE_SIZE = 1.6;

export const Space3DCanvas = memo(function Space3DCanvas({
  map,
  localPeer,
  remotePeers,
  speakingMap,
  theme = OFFICE_THEMES.midnight,
  onMove,
  onInteract,
}: Space3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Refs synced cleanly without ever rebuilding the WebGL scene
  const localPeerRef = useRef(localPeer);
  localPeerRef.current = localPeer;

  const remotePeersRef = useRef(remotePeers);
  remotePeersRef.current = remotePeers;

  const speakingMapRef = useRef(speakingMap);
  speakingMapRef.current = speakingMap;

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Live scene/light refs for instant zero-rebuild theme swaps
  const sceneRef = useRef<any>(null);
  const hemiLightRef = useRef<any>(null);
  const dirLightRef = useRef<any>(null);

  // Camera zoom & yaw controls (synced to animation loop via refs)
  const zoomRef = useRef(1.0);
  const yawRef = useRef(0);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [yawDeg, setYawDeg] = useState(0);

  const adjustZoom = (delta: number) => {
    const next = Math.max(0.65, Math.min(1.75, Number((zoomRef.current + delta).toFixed(2))));
    zoomRef.current = next;
    setZoomPercent(Math.round(next * 100));
  };

  const adjustYaw = (deltaRad: number) => {
    const next = Math.max(-0.7, Math.min(0.7, yawRef.current + deltaRad));
    yawRef.current = next;
    setYawDeg(Math.round((next * 180) / Math.PI));
  };

  const resetCameraView = () => {
    zoomRef.current = 1.0;
    yawRef.current = 0;
    setZoomPercent(100);
    setYawDeg(0);
  };

  useEffect(() => {
    const scene = sceneRef.current;
    const hemi = hemiLightRef.current;
    const dir = dirLightRef.current;
    if (!scene || !hemi || !dir) return;

    scene.background = new THREE.Color(theme.scene.skyHex);
    if (scene.fog) {
      scene.fog.color = new THREE.Color(theme.scene.fogHex);
    }
    hemi.color.setHex(theme.scene.hemiSkyHex);
    hemi.groundColor.setHex(theme.scene.hemiGroundHex);
    hemi.intensity = theme.scene.hemiIntensity;
    dir.intensity = theme.scene.dirIntensity;
  }, [theme]);

  // Position state in WebGL world space
  const posRef = useRef({
    x: localPeer.x,
    y: localPeer.y,
    worldX: (localPeer.x - map.cols / 2 + 0.5) * FLOOR_TILE_SIZE,
    worldZ: (localPeer.y - map.rows / 2 + 0.5) * FLOOR_TILE_SIZE,
    dir: localPeer.dir,
    isMoving: false,
    speed: 6.2, // world units per second (frame-rate independent)
    rotation: 0,
  });

  // Sync external room/peer warps (e.g. clicking "Boardroom" or "War Room")
  useEffect(() => {
    const halfCols = map.cols / 2;
    const halfRows = map.rows / 2;
    const dist = Math.hypot(localPeer.x - posRef.current.x, localPeer.y - posRef.current.y);
    if (dist > 2.5) {
      posRef.current.x = localPeer.x;
      posRef.current.y = localPeer.y;
      posRef.current.worldX = (localPeer.x - halfCols + 0.5) * FLOOR_TILE_SIZE;
      posRef.current.worldZ = (localPeer.y - halfRows + 0.5) * FLOOR_TILE_SIZE;
      pathRef.current = [];
    }
  }, [localPeer.x, localPeer.y, map.cols, map.rows]);

  const pathRef = useRef<[number, number][]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const nearbyObjectRef = useRef<InteractiveObject | null>(null);

  const [nearbyObject, setNearbyObject] = useState<InteractiveObject | null>(null);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      keysRef.current[e.code] = true;

      if (
        (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") &&
        nearbyObjectRef.current
      ) {
        e.preventDefault();
        onInteractRef.current(nearbyObjectRef.current);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Main Three.js Scene Setup (mounts ONCE per map, zero rebuilds during gameplay)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const halfCols = map.cols / 2;
    const halfRows = map.rows / 2;

    // 1. Scene & High-Performance Renderer
    const activeTheme = themeRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeTheme.scene.skyHex);
    scene.fog = new THREE.Fog(activeTheme.scene.fogHex, 34, 78);
    sceneRef.current = scene;

    let lastWidth = container.clientWidth || 800;
    let lastHeight = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(lastWidth, lastHeight);
    renderer.shadowMap.enabled = false; // Zero shadow-map overhead; crisp contact discs used instead
    container.appendChild(renderer.domElement);

    // 2. Elevated Isometric Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      44,
      lastWidth / lastHeight,
      0.5,
      140
    );
    camera.position.set(posRef.current.worldX, 16.5, posRef.current.worldZ + 18.0);
    camera.lookAt(posRef.current.worldX, 1.0, posRef.current.worldZ);

    // ResizeObserver prevents per-frame renderer.setSize thrashing
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(1, Math.floor(entry.contentRect.width));
      const h = Math.max(1, Math.floor(entry.contentRect.height));
      if (w !== lastWidth || h !== lastHeight) {
        lastWidth = w;
        lastHeight = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // 3. Lightweight Single-Pass Lighting (Hemisphere + Directional)
    const hemiLight = new THREE.HemisphereLight(
      activeTheme.scene.hemiSkyHex,
      activeTheme.scene.hemiGroundHex,
      activeTheme.scene.hemiIntensity
    );
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfff7ed, activeTheme.scene.dirIntensity);
    dirLight.position.set(18, 36, 22);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    let camFocusX = posRef.current.worldX;
    let camFocusZ = posRef.current.worldZ;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const next = Math.max(0.65, Math.min(1.75, Number((zoomRef.current + delta).toFixed(2))));
      zoomRef.current = next;
      setZoomPercent(Math.round(next * 100));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });

    // Track disposable resources for clean unmount
    const geometriesToDispose: any[] = [];
    const materialsToDispose: any[] = [];
    const trackGeo = <T,>(g: T): T => {
      geometriesToDispose.push(g);
      return g;
    };
    const trackMat = <T,>(m: T): T => {
      materialsToDispose.push(m);
      return m;
    };

    // 4. Batched InstancedMesh Static Office Environment (~18 total draw calls instead of 1,300+)
    const tileBuckets: Record<number, Array<{ x: number; z: number }>> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };
    const solidWalls: Array<{ x: number; z: number }> = [];
    const glassWalls: Array<{ x: number; z: number }> = [];

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const idx = r * map.cols + c;
        const tileId = map.ground[idx] ?? 1;
        const isWall = map.walls[idx];
        const posX = (c - halfCols + 0.5) * FLOOR_TILE_SIZE;
        const posZ = (r - halfRows + 0.5) * FLOOR_TILE_SIZE;

        if (isWall) {
          if (tileId === 7) {
            glassWalls.push({ x: posX, z: posZ });
          } else if (tileId === 6 || tileId === 8) {
            solidWalls.push({ x: posX, z: posZ });
          }
          // Under-wall base floor tile
          tileBuckets[1]!.push({ x: posX, z: posZ });
        } else {
          const bucketKey = tileId >= 2 && tileId <= 5 ? tileId : 1;
          tileBuckets[bucketKey]!.push({ x: posX, z: posZ });
        }
      }
    }

    const dummy = new THREE.Object3D();

    // Floor InstancedMeshes (5 draw calls total)
    const tileGeo = trackGeo(new THREE.BoxGeometry(FLOOR_TILE_SIZE * 0.985, 0.18, FLOOR_TILE_SIZE * 0.985));
    const floorMaterialConfigs: Record<number, number> = {
      1: 0x1e2238, // Open office slate/oak
      2: 0x16192e, // Reception deep navy
      3: 0x2c1b36, // Boardroom walnut/plum
      4: 0x122c33, // War room cyan-tinted tile
      5: 0x26293d, // Cafe lounge warm slate
    };

    for (const [tileTypeStr, coords] of Object.entries(tileBuckets)) {
      if (coords.length === 0) continue;
      const color = floorMaterialConfigs[Number(tileTypeStr)] ?? 0x1e2238;
      const mat = trackMat(new THREE.MeshLambertMaterial({ color }));
      const inst = new THREE.InstancedMesh(tileGeo, mat, coords.length);
      for (let i = 0; i < coords.length; i++) {
        const pt = coords[i]!;
        dummy.position.set(pt.x, -0.09, pt.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.matrixAutoUpdate = false;
      inst.updateMatrix();
      scene.add(inst);
    }

    // Wall InstancedMeshes (2 draw calls total)
    if (solidWalls.length > 0) {
      const wallGeo = trackGeo(new THREE.BoxGeometry(FLOOR_TILE_SIZE, 2.35, FLOOR_TILE_SIZE));
      const wallMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x2b3150 }));
      const wallInst = new THREE.InstancedMesh(wallGeo, wallMat, solidWalls.length);
      for (let i = 0; i < solidWalls.length; i++) {
        const pt = solidWalls[i]!;
        dummy.position.set(pt.x, 1.175, pt.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        wallInst.setMatrixAt(i, dummy.matrix);
      }
      wallInst.instanceMatrix.needsUpdate = true;
      wallInst.matrixAutoUpdate = false;
      wallInst.updateMatrix();
      scene.add(wallInst);
    }

    if (glassWalls.length > 0) {
      const glassGeo = trackGeo(new THREE.BoxGeometry(FLOOR_TILE_SIZE, 2.15, 0.14));
      const glassMat = trackMat(
        new THREE.MeshLambertMaterial({
          color: 0x37e6c4,
          transparent: true,
          opacity: 0.34,
        })
      );
      const glassInst = new THREE.InstancedMesh(glassGeo, glassMat, glassWalls.length);
      for (let i = 0; i < glassWalls.length; i++) {
        const pt = glassWalls[i]!;
        dummy.position.set(pt.x, 1.075, pt.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        glassInst.setMatrixAt(i, dummy.matrix);
      }
      glassInst.instanceMatrix.needsUpdate = true;
      glassInst.matrixAutoUpdate = false;
      glassInst.updateMatrix();
      scene.add(glassInst);
    }

    // Raycast Plane for smooth Click / Tap Pathfinding
    const raycastPlaneGeo = trackGeo(
      new THREE.PlaneGeometry(map.cols * FLOOR_TILE_SIZE, map.rows * FLOOR_TILE_SIZE)
    );
    const raycastPlaneMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
    const raycastPlane = new THREE.Mesh(raycastPlaneGeo, raycastPlaneMat);
    raycastPlane.rotation.x = -Math.PI / 2;
    scene.add(raycastPlane);

    // 5. Batched 3D Furniture & Static Props
    const desks = map.objects.filter((o) => o.kind === "desk");
    if (desks.length > 0) {
      const deskTopGeo = trackGeo(new THREE.BoxGeometry(1.4, 0.08, 0.9));
      const deskTopMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x505788 }));
      const deskInst = new THREE.InstancedMesh(deskTopGeo, deskTopMat, desks.length);

      const monitorGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.34, 0.04));
      const monitorMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x37e6c4 }));
      const monInst = new THREE.InstancedMesh(monitorGeo, monitorMat, desks.length * 2);

      const chairGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12));
      const chairMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x12172c }));
      const chairInst = new THREE.InstancedMesh(chairGeo, chairMat, desks.length);

      for (let i = 0; i < desks.length; i++) {
        const obj = desks[i]!;
        const dx = (obj.x - halfCols + 0.5) * FLOOR_TILE_SIZE;
        const dz = (obj.y - halfRows + 0.5) * FLOOR_TILE_SIZE;

        // Desk
        dummy.position.set(dx, 0.75, dz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        deskInst.setMatrixAt(i, dummy.matrix);

        // Monitor 1
        dummy.position.set(dx - 0.3, 1.05, dz - 0.2);
        dummy.rotation.set(0, 0.15, 0);
        dummy.updateMatrix();
        monInst.setMatrixAt(i * 2, dummy.matrix);

        // Monitor 2
        dummy.position.set(dx + 0.3, 1.05, dz - 0.2);
        dummy.rotation.set(0, -0.15, 0);
        dummy.updateMatrix();
        monInst.setMatrixAt(i * 2 + 1, dummy.matrix);

        // Chair
        dummy.position.set(dx, 0.45, dz + 0.65);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        chairInst.setMatrixAt(i, dummy.matrix);
      }

      deskInst.instanceMatrix.needsUpdate = true;
      monInst.instanceMatrix.needsUpdate = true;
      chairInst.instanceMatrix.needsUpdate = true;
      scene.add(deskInst, monInst, chairInst);
    }

    // Executive Conference Table, Presentation Screen, Whiteboard, Radio, Espresso, Cooler
    const confTableGeo = trackGeo(new THREE.BoxGeometry(6 * FLOOR_TILE_SIZE, 0.12, 2.5 * FLOOR_TILE_SIZE));
    const confTableMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x623d28 }));
    const confTable = new THREE.Mesh(confTableGeo, confTableMat);
    confTable.position.set((31.5 - halfCols) * FLOOR_TILE_SIZE, 0.8, (7 - halfRows) * FLOOR_TILE_SIZE);
    scene.add(confTable);

    const screenGeo = trackGeo(new THREE.BoxGeometry(3.6, 2.0, 0.1));
    const screenMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
    const bigScreen = new THREE.Mesh(screenGeo, screenMat);
    bigScreen.position.set((31 - halfCols) * FLOOR_TILE_SIZE, 2.2, (2 - halfRows) * FLOOR_TILE_SIZE + 0.1);
    scene.add(bigScreen);

    const wbBoardGeo = trackGeo(new THREE.BoxGeometry(2.2, 1.5, 0.06));
    const wbMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
    const whiteboardMesh = new THREE.Mesh(wbBoardGeo, wbMat);
    whiteboardMesh.position.set((32 - halfCols) * FLOOR_TILE_SIZE, 1.6, (14 - halfRows) * FLOOR_TILE_SIZE);
    scene.add(whiteboardMesh);

    const radioGeo = trackGeo(new THREE.BoxGeometry(0.8, 0.6, 0.5));
    const radioMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x8b5a2b }));
    const radioMesh = new THREE.Mesh(radioGeo, radioMat);
    radioMesh.position.set((20 - halfCols) * FLOOR_TILE_SIZE, 0.8, (19 - halfRows) * FLOOR_TILE_SIZE);
    scene.add(radioMesh);

    const coffeeGeo = trackGeo(new THREE.BoxGeometry(0.7, 0.7, 0.6));
    const coffeeMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xf97316 }));
    const coffeeMesh = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffeeMesh.position.set((17 - halfCols) * FLOOR_TILE_SIZE, 0.8, (19 - halfRows) * FLOOR_TILE_SIZE);
    scene.add(coffeeMesh);

    const coolerBaseGeo = trackGeo(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 12));
    const coolerBottleGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12));
    const coolerMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
    const bottleMat = trackMat(
      new THREE.MeshLambertMaterial({ color: 0x37e6c4, transparent: true, opacity: 0.65 })
    );
    const coolerBase = new THREE.Mesh(coolerBaseGeo, coolerMat);
    const coolerBottle = new THREE.Mesh(coolerBottleGeo, bottleMat);
    coolerBase.position.set((13 - halfCols) * FLOOR_TILE_SIZE, 0.45, (19 - halfRows) * FLOOR_TILE_SIZE);
    coolerBottle.position.set((13 - halfCols) * FLOOR_TILE_SIZE, 1.15, (19 - halfRows) * FLOOR_TILE_SIZE);
    scene.add(coolerBase, coolerBottle);

    // 6. Shared Avatar Geometries & Cached Color Materials (Multi-User Scalable!)
    const avatarBodyGeo = trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 12));
    const avatarHeadGeo = trackGeo(new THREE.SphereGeometry(0.29, 12, 10));
    const avatarHairGeo = trackGeo(
      new THREE.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    );
    const avatarVisorGeo = trackGeo(new THREE.BoxGeometry(0.26, 0.09, 0.1));
    const avatarShadowGeo = trackGeo(new THREE.CircleGeometry(0.46, 16));
    const avatarRingGeo = trackGeo(new THREE.RingGeometry(0.62, 0.78, 24));

    const avatarHeadMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xffccaa }));
    const avatarVisorMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    const avatarShadowMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0x05070e, transparent: true, opacity: 0.45 })
    );
    const avatarRingMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0x37e6c4, side: THREE.DoubleSide })
    );

    const colorMatCache = new Map<string, any>();
    const getColorMaterial = (hex: string) => {
      const normalized = (hex || "#37E6C4").toLowerCase();
      let mat = colorMatCache.get(normalized);
      if (!mat) {
        mat = trackMat(new THREE.MeshLambertMaterial({ color: normalized }));
        colorMatCache.set(normalized, mat);
      }
      return mat;
    };

    const createAvatarRig = (colorHex: string): AvatarRig => {
      const group = new THREE.Group();
      const suitMat = getColorMaterial(colorHex);

      // Zero-cost ground contact shadow disc
      const shadow = new THREE.Mesh(avatarShadowGeo, avatarShadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      group.add(shadow);

      const body = new THREE.Mesh(avatarBodyGeo, suitMat);
      body.position.y = 0.8;
      group.add(body);

      const head = new THREE.Mesh(avatarHeadGeo, avatarHeadMat);
      head.position.y = 1.45;
      group.add(head);

      const hair = new THREE.Mesh(avatarHairGeo, suitMat);
      hair.position.y = 1.48;
      group.add(hair);

      const visor = new THREE.Mesh(avatarVisorGeo, avatarVisorMat);
      visor.position.set(0, 1.45, 0.27);
      group.add(visor);

      const ring = new THREE.Mesh(avatarRingGeo, avatarRingMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      ring.visible = false;
      group.add(ring);

      return {
        group,
        body,
        head,
        hair,
        visor,
        ring,
        color: colorHex,
        targetX: 0,
        targetZ: 0,
        targetRot: 0,
        isMoving: false,
      };
    };

    const avatarsGroup = new THREE.Group();
    scene.add(avatarsGroup);

    const localAvatarRig = createAvatarRig(localPeerRef.current.avatarColor);
    avatarsGroup.add(localAvatarRig.group);

    const remoteAvatarRigs = new Map<string, AvatarRig>();

    // 7. Raycasting Pointer Input
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        if (!e.touches || !e.touches[0]) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      mouse.x = ((clientX - rect.left) / lastWidth) * 2 - 1;
      mouse.y = -((clientY - rect.top) / lastHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(raycastPlane);

      if (intersects.length > 0 && intersects[0]) {
        const point = intersects[0].point;
        const targetCol = Math.floor(point.x / FLOOR_TILE_SIZE + halfCols);
        const targetRow = Math.floor(point.z / FLOOR_TILE_SIZE + halfRows);

        const startCol = Math.round(posRef.current.worldX / FLOOR_TILE_SIZE + halfCols - 0.5);
        const startRow = Math.round(posRef.current.worldZ / FLOOR_TILE_SIZE + halfRows - 0.5);

        if (
          targetCol >= 0 &&
          targetCol < map.cols &&
          targetRow >= 0 &&
          targetRow < map.rows
        ) {
          const path = findPath(
            startCol,
            startRow,
            targetCol,
            targetRow,
            map.walls,
            map.cols,
            map.rows
          );
          if (path.length > 0) {
            pathRef.current = path;
          }
        }
      }
    };

    container.addEventListener("mousedown", handlePointerDown);
    container.addEventListener("touchstart", handlePointerDown, { passive: true });

    // 8. Delta-Time 60+ FPS Render Loop (Zero allocations, zero React churn)
    let animId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;
    let lastNetworkEmitTime = 0;
    let lastSentCol = posRef.current.x;
    let lastSentRow = posRef.current.y;
    let lastSentDir: PeerState["dir"] = posRef.current.dir;
    let lastSentMoving = false;
    let lastSentZoneId = localPeerRef.current.zoneId;
    let lastNearbyId: string | null = null;

    // Reusable vector for 3D->2D projection (zero GC)
    const projVec = new THREE.Vector3();

    const dirToRot = (dir: PeerState["dir"]) => {
      if (dir === "left") return -Math.PI / 2;
      if (dir === "right") return Math.PI / 2;
      if (dir === "up") return Math.PI;
      return 0;
    };

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      // Save 100% GPU when tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        lastTime = now;
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsedTotal += dt;

      // 8a. Local Avatar Movement
      const pos = posRef.current;
      let vx = 0;
      let vz = 0;

      const keys = keysRef.current;
      if (keys["KeyW"] || keys["ArrowUp"]) vz -= 1;
      if (keys["KeyS"] || keys["ArrowDown"]) vz += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) vx -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) vx += 1;

      const stepDist = pos.speed * dt;

      if (vx !== 0 || vz !== 0) {
        pathRef.current = [];
        if (vx !== 0 && vz !== 0) {
          vx *= 0.7071;
          vz *= 0.7071;
        }

        const nextX = pos.worldX + vx * stepDist;
        const nextZ = pos.worldZ + vz * stepDist;

        const nextCol = Math.floor(nextX / FLOOR_TILE_SIZE + halfCols);
        const nextRow = Math.floor(nextZ / FLOOR_TILE_SIZE + halfRows);

        if (
          nextCol >= 0 &&
          nextCol < map.cols &&
          nextRow >= 0 &&
          nextRow < map.rows &&
          !map.walls[nextRow * map.cols + nextCol]
        ) {
          pos.worldX = nextX;
          pos.worldZ = nextZ;
          pos.isMoving = true;
          pos.rotation = Math.atan2(vx, vz);
        } else {
          // Axis slide along walls for silky collision
          const slideXCol = Math.floor(nextX / FLOOR_TILE_SIZE + halfCols);
          const curRow = Math.floor(pos.worldZ / FLOOR_TILE_SIZE + halfRows);
          if (
            slideXCol >= 0 &&
            slideXCol < map.cols &&
            !map.walls[curRow * map.cols + slideXCol]
          ) {
            pos.worldX = nextX;
            pos.isMoving = true;
            pos.rotation = Math.atan2(vx, 0);
          } else {
            const curCol = Math.floor(pos.worldX / FLOOR_TILE_SIZE + halfCols);
            const slideZRow = Math.floor(nextZ / FLOOR_TILE_SIZE + halfRows);
            if (
              slideZRow >= 0 &&
              slideZRow < map.rows &&
              !map.walls[slideZRow * map.cols + curCol]
            ) {
              pos.worldZ = nextZ;
              pos.isMoving = true;
              pos.rotation = Math.atan2(0, vz);
            } else {
              pos.isMoving = false;
            }
          }
        }
      } else if (pathRef.current.length > 0 && pathRef.current[0]) {
        const [targetCol, targetRow] = pathRef.current[0];
        const targetX = (targetCol - halfCols + 0.5) * FLOOR_TILE_SIZE;
        const targetZ = (targetRow - halfRows + 0.5) * FLOOR_TILE_SIZE;

        const dx = targetX - pos.worldX;
        const dz = targetZ - pos.worldZ;
        const dist = Math.hypot(dx, dz);

        if (dist <= stepDist) {
          pos.worldX = targetX;
          pos.worldZ = targetZ;
          pathRef.current.shift();
          pos.isMoving = pathRef.current.length > 0;
        } else {
          pos.isMoving = true;
          pos.worldX += (dx / dist) * stepDist;
          pos.worldZ += (dz / dist) * stepDist;
          pos.rotation = Math.atan2(dx, dz);
        }
      } else {
        pos.isMoving = false;
      }

      // Update local avatar rig (and reflect live customization color)
      const currentLocal = localPeerRef.current;
      if (localAvatarRig.color !== currentLocal.avatarColor) {
        const nextMat = getColorMaterial(currentLocal.avatarColor);
        localAvatarRig.body.material = nextMat;
        localAvatarRig.hair.material = nextMat;
        localAvatarRig.color = currentLocal.avatarColor;
      }

      localAvatarRig.group.position.set(pos.worldX, 0, pos.worldZ);
      localAvatarRig.group.rotation.y = pos.rotation;

      if (pos.isMoving) {
        const bob = Math.sin(elapsedTotal * 14) * 0.07;
        localAvatarRig.body.position.y = 0.8 + bob;
        localAvatarRig.head.position.y = 1.45 + bob;
        localAvatarRig.hair.position.y = 1.48 + bob;
        localAvatarRig.visor.position.y = 1.45 + bob;
      } else {
        localAvatarRig.body.position.y = 0.8;
        localAvatarRig.head.position.y = 1.45;
        localAvatarRig.hair.position.y = 1.48;
        localAvatarRig.visor.position.y = 1.45;
      }

      const activeSpeaking = speakingMapRef.current;
      const isLocalSpeaking = !!activeSpeaking["local"];
      localAvatarRig.ring.visible = isLocalSpeaking;
      if (isLocalSpeaking) {
        const pulse = 1 + Math.sin(elapsedTotal * 8) * 0.14;
        localAvatarRig.ring.scale.set(pulse, pulse, 1);
      }

      // 8b. Smooth Interpolation for All Remote Peers
      const peers = remotePeersRef.current;
      const lerpFactor = 1 - Math.exp(-12 * dt);

      // Build quick active ID set without allocating per frame unnecessarily
      for (let i = 0; i < peers.length; i++) {
        const peer = peers[i]!;
        let rig = remoteAvatarRigs.get(peer.id);
        const tx = (peer.x - halfCols + 0.5) * FLOOR_TILE_SIZE;
        const tz = (peer.y - halfRows + 0.5) * FLOOR_TILE_SIZE;

        if (!rig) {
          rig = createAvatarRig(peer.avatarColor);
          rig.group.position.set(tx, 0, tz);
          rig.targetX = tx;
          rig.targetZ = tz;
          avatarsGroup.add(rig.group);
          remoteAvatarRigs.set(peer.id, rig);
        } else if (rig.color !== peer.avatarColor) {
          const nextMat = getColorMaterial(peer.avatarColor);
          rig.body.material = nextMat;
          rig.hair.material = nextMat;
          rig.color = peer.avatarColor;
        }

        rig.targetX = tx;
        rig.targetZ = tz;
        rig.targetRot = dirToRot(peer.dir);

        const prevX = rig.group.position.x;
        const prevZ = rig.group.position.z;
        rig.group.position.x += (tx - prevX) * lerpFactor;
        rig.group.position.z += (tz - prevZ) * lerpFactor;

        const moveDelta = Math.hypot(rig.group.position.x - prevX, rig.group.position.z - prevZ);
        const remoteMoving = peer.isMoving || moveDelta > 0.008;

        // Smooth shortest-angle rotation
        let rotDiff = rig.targetRot - rig.group.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        rig.group.rotation.y += rotDiff * lerpFactor;

        if (remoteMoving) {
          const bob = Math.sin(elapsedTotal * 14 + i) * 0.07;
          rig.body.position.y = 0.8 + bob;
          rig.head.position.y = 1.45 + bob;
          rig.hair.position.y = 1.48 + bob;
          rig.visor.position.y = 1.45 + bob;
        } else {
          rig.body.position.y = 0.8;
          rig.head.position.y = 1.45;
          rig.hair.position.y = 1.48;
          rig.visor.position.y = 1.45;
        }

        const isSpeaking = !!activeSpeaking[peer.id];
        rig.ring.visible = isSpeaking;
        if (isSpeaking) {
          const pulse = 1 + Math.sin(elapsedTotal * 8 + i) * 0.14;
          rig.ring.scale.set(pulse, pulse, 1);
        }
      }

      // Prune disconnected remote rigs
      for (const [id, rig] of remoteAvatarRigs.entries()) {
        if (!peers.some((p) => p.id === id)) {
          avatarsGroup.remove(rig.group);
          remoteAvatarRigs.delete(id);
        }
      }

      // 8c. Zone, Proximity, and On-Change Throttled Signaling
      const curCol = Math.round(pos.worldX / FLOOR_TILE_SIZE + halfCols - 0.5);
      const curRow = Math.round(pos.worldZ / FLOOR_TILE_SIZE + halfRows - 0.5);
      pos.x = curCol;
      pos.y = curRow;

      const curZone = getZoneAt(curCol, curRow, map.zones);
      const curZoneId = curZone?.id || "open_desks";

      let dirName: PeerState["dir"] = "down";
      if (Math.abs(pos.rotation) < 0.5) dirName = "down";
      else if (Math.abs(Math.abs(pos.rotation) - Math.PI) < 0.5) dirName = "up";
      else if (pos.rotation > 0) dirName = "right";
      else dirName = "left";

      const stateChanged =
        curCol !== lastSentCol ||
        curRow !== lastSentRow ||
        dirName !== lastSentDir ||
        pos.isMoving !== lastSentMoving ||
        curZoneId !== lastSentZoneId;

      if (stateChanged && now - lastNetworkEmitTime >= 90) {
        lastNetworkEmitTime = now;
        lastSentCol = curCol;
        lastSentRow = curRow;
        lastSentDir = dirName;
        lastSentMoving = pos.isMoving;
        lastSentZoneId = curZoneId;
        onMoveRef.current(curCol, curRow, dirName, pos.isMoving, curZoneId);
      }

      // Only call React setNearbyObject when nearby object ID actually changes
      let closestObj: InteractiveObject | null = null;
      let closestDist = 1.8;
      for (let i = 0; i < map.objects.length; i++) {
        const obj = map.objects[i]!;
        const d = Math.hypot(obj.x - curCol, obj.y - curRow);
        if (d <= closestDist) {
          closestDist = d;
          closestObj = obj;
        }
      }
      const nextNearbyId = closestObj?.id ?? null;
      if (nextNearbyId !== lastNearbyId) {
        lastNearbyId = nextNearbyId;
        nearbyObjectRef.current = closestObj;
        setNearbyObject(closestObj);
      }

      // 8d. Frame-rate Independent Isometric Orbit & Zoom Camera Follow
      const camLerp = 1 - Math.exp(-8 * dt);
      camFocusX += (pos.worldX - camFocusX) * camLerp;
      camFocusZ += (pos.worldZ - camFocusZ) * camLerp;

      const camDist = 18.0 / zoomRef.current;
      const camHeight = 16.5 / zoomRef.current;
      const offsetX = Math.sin(yawRef.current) * camDist;
      const offsetZ = Math.cos(yawRef.current) * camDist;

      camera.position.set(camFocusX + offsetX, camHeight, camFocusZ + offsetZ);
      camera.lookAt(camFocusX, 1.0, camFocusZ);

      // 8e. Direct 60Hz DOM Screen Position Update for Floating Video Bubbles (0 React renders!)
      const screenPositions: Record<string, ScreenPosition> = {};
      projVec.set(pos.worldX, 2.25, pos.worldZ).project(camera);
      const localSx = ((projVec.x + 1) * lastWidth) / 2;
      const localSy = ((-projVec.y + 1) * lastHeight) / 2;
      screenPositions[currentLocal.id] = {
        screenX: localSx,
        screenY: localSy,
        inView: projVec.z < 1 && localSx >= -60 && localSx <= lastWidth + 60,
      };

      for (let i = 0; i < peers.length; i++) {
        const p = peers[i]!;
        const rig = remoteAvatarRigs.get(p.id);
        const wx = rig ? rig.group.position.x : (p.x - halfCols + 0.5) * FLOOR_TILE_SIZE;
        const wz = rig ? rig.group.position.z : (p.y - halfRows + 0.5) * FLOOR_TILE_SIZE;

        projVec.set(wx, 2.25, wz).project(camera);
        const sx = ((projVec.x + 1) * lastWidth) / 2;
        const sy = ((-projVec.y + 1) * lastHeight) / 2;
        screenPositions[p.id] = {
          screenX: sx,
          screenY: sy,
          inView:
            projVec.z < 1 &&
            sx >= -60 &&
            sx <= lastWidth + 60 &&
            sy >= -60 &&
            sy <= lastHeight + 60,
        };
      }

      screenPositionsStore.update(screenPositions);

      // 8f. Single WebGL Render Pass
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener("mousedown", handlePointerDown);
      container.removeEventListener("touchstart", handlePointerDown);
      container.removeEventListener("wheel", handleWheel);
      sceneRef.current = null;
      hemiLightRef.current = null;
      dirLightRef.current = null;

      for (const geo of geometriesToDispose) {
        geo?.dispose?.();
      }
      for (const mat of materialsToDispose) {
        mat?.dispose?.();
      }

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [map]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-bg">
      {/* Floating Interaction Prompt (positioned cleanly above SpaceControls dock) */}
      {nearbyObject && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
          <div className="px-4 py-2 bg-surface/95 backdrop-blur-md border-2 border-accent rounded-control shadow-arcade flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-accent text-bg font-display text-xs font-bold flex items-center justify-center">
              E
            </span>
            <span className="text-text font-display text-sm tracking-wide">
              {nearbyObject.kind === "radio" && "Tune Lo-Fi Radio"}
              {nearbyObject.kind === "coffee" && "Brew Boost Espresso"}
              {nearbyObject.kind === "desk" && `Claim ${nearbyObject.name}`}
              {nearbyObject.kind === "whiteboard" && "Open Team Whiteboard"}
              {nearbyObject.kind === "watercooler" && "Drink Water & Chat"}
              {nearbyObject.kind === "screen" && "Watch HD Presentation"}
            </span>
          </div>
        </div>
      )}

      {/* Bottom-Right 3D Camera Zoom & Angle Controls (subtle on desktop) */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="hidden sm:flex absolute bottom-4 right-4 z-20 items-center gap-0.5 px-1.5 py-1 rounded-full bg-surface/70 backdrop-blur-md border border-border/70 shadow-sm text-[11px] font-mono text-text opacity-75 hover:opacity-100 transition-opacity"
      >
        <button
          type="button"
          onClick={() => adjustZoom(-0.15)}
          title="Zoom Out (or scroll down)"
          aria-label="Zoom out 3D camera"
          className="w-6 h-6 rounded-full hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text"
        >
          <IconZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={resetCameraView}
          title="Reset Camera Zoom & Angle"
          className="px-1.5 h-6 rounded-full hover:bg-surface-2 text-[10px] font-semibold text-accent-2"
        >
          {zoomPercent}%
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(0.15)}
          title="Zoom In (or scroll up)"
          aria-label="Zoom in 3D camera"
          className="w-6 h-6 rounded-full hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text"
        >
          <IconZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-0.5" />

        <button
          type="button"
          onClick={() => adjustYaw(-0.2)}
          title="Orbit Camera Left"
          aria-label="Rotate camera left"
          className="px-1.5 h-6 rounded-full hover:bg-surface-2 text-text-muted hover:text-text"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={() => adjustYaw(0.2)}
          title="Orbit Camera Right"
          aria-label="Rotate camera right"
          className="px-1.5 h-6 rounded-full hover:bg-surface-2 text-text-muted hover:text-text"
        >
          ↻
        </button>
        {yawDeg !== 0 && (
          <button
            type="button"
            onClick={resetCameraView}
            title="Reset Camera Angle"
            aria-label="Reset camera angle"
            className="inline-flex items-center gap-0.5 px-1.5 h-6 rounded-full bg-surface-2 text-accent text-[10px]"
          >
            <IconCompass className="w-3 h-3" />
            <span>{yawDeg > 0 ? `+${yawDeg}°` : `${yawDeg}°`}</span>
          </button>
        )}
      </div>
    </div>
  );
});
