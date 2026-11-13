"use client";

import React, { useRef, useEffect, useState } from "react";
import { THREE } from "@/lib/three";
import {
  OfficeTilemap,
  OFFICE_ZONES,
  getZoneAt,
  findPath,
  SpaceZone,
  InteractiveObject,
} from "@/lib/space/officeMap";
import { PeerState } from "@/lib/space/signaling";

interface Space3DCanvasProps {
  map: OfficeTilemap;
  localPeer: PeerState;
  remotePeers: PeerState[];
  speakingMap: Record<string, boolean>;
  onMove: (x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string) => void;
  onInteract: (obj: InteractiveObject) => void;
  onScreenPositionUpdate?: (positions: Record<string, { screenX: number; screenY: number; inView: boolean }>) => void;
}

export function Space3DCanvas({
  map,
  localPeer,
  remotePeers,
  speakingMap,
  onMove,
  onInteract,
  onScreenPositionUpdate,
}: Space3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Position state (in tile coordinates with smooth interpolation)
  const posRef = useRef({
    x: localPeer.x,
    y: localPeer.y,
    worldX: (localPeer.x - map.cols / 2) * 1.6,
    worldZ: (localPeer.y - map.rows / 2) * 1.6,
    targetX: (localPeer.x - map.cols / 2) * 1.6,
    targetZ: (localPeer.y - map.rows / 2) * 1.6,
    dir: localPeer.dir,
    isMoving: false,
    speed: 0.12, // units per frame
    rotation: 0,
  });

  const pathRef = useRef<[number, number][]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const [nearbyObject, setNearbyObject] = useState<InteractiveObject | null>(null);
  const [activeZone, setActiveZone] = useState<SpaceZone | null>(null);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      keysRef.current[e.code] = true;

      // Interaction trigger: E or Space or Enter
      if ((e.code === "KeyE" || e.code === "Space" || e.code === "Enter") && nearbyObject) {
        e.preventDefault();
        onInteract(nearbyObject);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [nearbyObject, onInteract]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e111a);
    scene.fog = new THREE.FogExp2(0x0e111a, 0.015);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Camera: Elevated Isometric / Third-Person Perspective
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 0.85);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    const d = 35;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Room Accent Lights
    const boardroomLight = new THREE.PointLight(0xff88aa, 1.2, 25);
    boardroomLight.position.set(12, 6, -10);
    scene.add(boardroomLight);

    const warRoomLight = new THREE.PointLight(0x37e6c4, 1.2, 20);
    warRoomLight.position.set(12, 6, 6);
    scene.add(warRoomLight);

    const loungeLight = new THREE.PointLight(0xffaa33, 1.0, 20);
    loungeLight.position.set(0, 5, 12);
    scene.add(loungeLight);

    // 4. Build 3D Floor & Walls
    const floorTileSize = 1.6;
    const halfCols = map.cols / 2;
    const halfRows = map.rows / 2;

    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    // Reusable Materials
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2b304d, roughness: 0.8 });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x37e6c4,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
    });
    const woodFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x1e2238, roughness: 0.7 });
    const boardroomFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1a33, roughness: 0.6 });
    const warRoomFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x122a30, roughness: 0.7 });
    const cafeFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x24283b, roughness: 0.6 });
    const receptionFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x16192e, roughness: 0.7 });

    // Ground Plane for Raycasting
    const raycastPlaneGeo = new THREE.PlaneGeometry(map.cols * floorTileSize, map.rows * floorTileSize);
    const raycastPlaneMat = new THREE.MeshBasicMaterial({ visible: false });
    const raycastPlane = new THREE.Mesh(raycastPlaneGeo, raycastPlaneMat);
    raycastPlane.rotation.x = -Math.PI / 2;
    scene.add(raycastPlane);

    // Create 3D Tiles & Wall Blocks
    const tileGeo = new THREE.BoxGeometry(floorTileSize, 0.2, floorTileSize);
    const wallGeo = new THREE.BoxGeometry(floorTileSize, 2.4, floorTileSize);
    const glassGeo = new THREE.BoxGeometry(floorTileSize, 2.2, 0.15);

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const idx = r * map.cols + c;
        const tileId = map.ground[idx] ?? 1;
        const isWall = map.walls[idx];
        const posX = (c - halfCols + 0.5) * floorTileSize;
        const posZ = (r - halfRows + 0.5) * floorTileSize;

        // Floor Mesh
        let mat = woodFloorMaterial;
        if (tileId === 3) mat = boardroomFloorMaterial;
        else if (tileId === 4) mat = warRoomFloorMaterial;
        else if (tileId === 5) mat = cafeFloorMaterial;
        else if (tileId === 2) mat = receptionFloorMaterial;

        const tileMesh = new THREE.Mesh(tileGeo, mat);
        tileMesh.position.set(posX, -0.1, posZ);
        tileMesh.receiveShadow = true;
        floorGroup.add(tileMesh);

        // Wall or Glass Mesh
        if (isWall) {
          if (tileId === 7) {
            // Glass wall
            const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
            glassMesh.position.set(posX, 1.1, posZ);
            floorGroup.add(glassMesh);
          } else if (tileId === 6 || tileId === 8) {
            // Solid outer/partition wall
            const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
            wallMesh.position.set(posX, 1.2, posZ);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            floorGroup.add(wallMesh);
          }
        }
      }
    }

    // 5. 3D Furniture & Interactive Objects
    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);

    // Desk 3D Model Builder
    const deskTopGeo = new THREE.BoxGeometry(1.4, 0.08, 0.9);
    const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x4e5482, roughness: 0.5 });
    const monitorGeo = new THREE.BoxGeometry(0.5, 0.35, 0.04);
    const monitorScreenMat = new THREE.MeshBasicMaterial({ color: 0x37e6c4 });
    const chairSeatGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x11162b, roughness: 0.8 });

    // Boardroom Table
    const confTableGeo = new THREE.BoxGeometry(6 * floorTileSize, 0.12, 2.5 * floorTileSize);
    const confTableMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.4 });
    const confTable = new THREE.Mesh(confTableGeo, confTableMat);
    confTable.position.set((31.5 - halfCols) * floorTileSize, 0.8, (7 - halfRows) * floorTileSize);
    confTable.castShadow = true;
    confTable.receiveShadow = true;
    furnitureGroup.add(confTable);

    // Presentation Screen on Boardroom Wall
    const screenGeo = new THREE.BoxGeometry(3.5, 2.0, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00a8ff });
    const bigScreen = new THREE.Mesh(screenGeo, screenMat);
    bigScreen.position.set((31 - halfCols) * floorTileSize, 2.2, (2 - halfRows) * floorTileSize + 0.1);
    furnitureGroup.add(bigScreen);

    // Whiteboard in War Room
    const wbBoardGeo = new THREE.BoxGeometry(2.2, 1.5, 0.06);
    const wbMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
    const whiteboardMesh = new THREE.Mesh(wbBoardGeo, wbMat);
    whiteboardMesh.position.set((32 - halfCols) * floorTileSize, 1.6, (14 - halfRows) * floorTileSize);
    furnitureGroup.add(whiteboardMesh);

    // Lo-Fi Vintage Radio in Lounge
    const radioGeo = new THREE.BoxGeometry(0.8, 0.6, 0.5);
    const radioMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.5 });
    const radioMesh = new THREE.Mesh(radioGeo, radioMat);
    radioMesh.position.set((20 - halfCols) * floorTileSize, 0.8, (19 - halfRows) * floorTileSize);
    radioMesh.castShadow = true;
    furnitureGroup.add(radioMesh);

    // Espresso Machine in Lounge
    const coffeeGeo = new THREE.BoxGeometry(0.7, 0.7, 0.6);
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, metalness: 0.5 });
    const coffeeMesh = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffeeMesh.position.set((17 - halfCols) * floorTileSize, 0.8, (19 - halfRows) * floorTileSize);
    coffeeMesh.castShadow = true;
    furnitureGroup.add(coffeeMesh);

    // Watercooler in Lounge
    const coolerBaseGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16);
    const coolerBottleGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.6, 16);
    const coolerMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const bottleMat = new THREE.MeshPhysicalMaterial({ color: 0x37e6c4, transparent: true, opacity: 0.6 });
    const coolerBase = new THREE.Mesh(coolerBaseGeo, coolerMat);
    const coolerBottle = new THREE.Mesh(coolerBottleGeo, bottleMat);
    coolerBase.position.set((13 - halfCols) * floorTileSize, 0.45, (19 - halfRows) * floorTileSize);
    coolerBottle.position.set((13 - halfCols) * floorTileSize, 1.15, (19 - halfRows) * floorTileSize);
    furnitureGroup.add(coolerBase);
    furnitureGroup.add(coolerBottle);

    // Build Desks
    for (const obj of map.objects) {
      if (obj.kind === "desk") {
        const dx = (obj.x - halfCols + 0.5) * floorTileSize;
        const dz = (obj.y - halfRows + 0.5) * floorTileSize;

        const desk = new THREE.Mesh(deskTopGeo, deskTopMat);
        desk.position.set(dx, 0.75, dz);
        desk.castShadow = true;
        furnitureGroup.add(desk);

        // Monitors
        const mon1 = new THREE.Mesh(monitorGeo, monitorScreenMat);
        mon1.position.set(dx - 0.3, 1.05, dz - 0.2);
        const mon2 = new THREE.Mesh(monitorGeo, monitorScreenMat);
        mon2.position.set(dx + 0.3, 1.05, dz - 0.2);
        mon2.rotation.y = -0.2;
        furnitureGroup.add(mon1);
        furnitureGroup.add(mon2);

        // Swivel Chair
        const chair = new THREE.Mesh(chairSeatGeo, chairMat);
        chair.position.set(dx, 0.45, dz + 0.65);
        furnitureGroup.add(chair);
      }
    }

    // 6. 3D Avatar Instances (Local & Remotes)
    const avatarsGroup = new THREE.Group();
    scene.add(avatarsGroup);

    // Function to build a 3D Avatar Mesh
    const createAvatar3D = (name: string, colorHex: string, isLocal: boolean) => {
      const group = new THREE.Group();

      // Body / Torso
      const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.8;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.45;
      head.castShadow = true;
      group.add(head);

      // Hair / Hat Accent
      const hairGeo = new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const hairMat = new THREE.MeshStandardMaterial({ color: colorHex });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 1.48;
      group.add(hair);

      // Face direction visor
      const visorGeo = new THREE.BoxGeometry(0.25, 0.1, 0.1);
      const visorMat = new THREE.MeshBasicMaterial({ color: 0x11162b });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.45, 0.28);
      group.add(visor);

      // Speaking Ring Indicator (Torus on floor)
      const ringGeo = new THREE.RingGeometry(0.7, 0.85, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x37e6c4, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      ring.visible = false;
      group.add(ring);

      return { group, body, ring };
    };

    // Build Local 3D Avatar
    const localAvatar3D = createAvatar3D(localPeer.name, localPeer.avatarColor, true);
    avatarsGroup.add(localAvatar3D.group);

    // Map of remote peer 3D avatars
    const remoteAvatars3D = new Map<string, ReturnType<typeof createAvatar3D>>();

    // 7. Raycasting for Click / Tap-to-Move
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

      mouse.x = ((clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(raycastPlane);

      if (intersects.length > 0 && intersects[0]) {
        const point = intersects[0].point;
        const targetCol = Math.floor(point.x / floorTileSize + halfCols);
        const targetRow = Math.floor(point.z / floorTileSize + halfRows);

        const startCol = Math.round(posRef.current.worldX / floorTileSize + halfCols - 0.5);
        const startRow = Math.round(posRef.current.worldZ / floorTileSize + halfRows - 0.5);

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

    // 8. 60Hz Render & Physics Loop
    let animId: number;
    let tick = 0;

    const animate = () => {
      tick++;

      // Handle Resize
      if (
        container.clientWidth !== renderer.domElement.width ||
        container.clientHeight !== renderer.domElement.height
      ) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }

      // Movement Logic
      const pos = posRef.current;
      let vx = 0;
      let vz = 0;

      const keys = keysRef.current;
      if (keys["KeyW"] || keys["ArrowUp"]) vz -= 1;
      if (keys["KeyS"] || keys["ArrowDown"]) vz += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) vx -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) vx += 1;

      if (vx !== 0 || vz !== 0) {
        pathRef.current = [];
        if (vx !== 0 && vz !== 0) {
          vx *= 0.7071;
          vz *= 0.7071;
        }

        const nextX = pos.worldX + vx * pos.speed * 1.5;
        const nextZ = pos.worldZ + vz * pos.speed * 1.5;

        // Tile collision check
        const nextCol = Math.floor(nextX / floorTileSize + halfCols);
        const nextRow = Math.floor(nextZ / floorTileSize + halfRows);

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
        }
      } else if (pathRef.current.length > 0 && pathRef.current[0]) {
        // Follow Pathfinding Waypoints
        const [nextCol, nextRow] = pathRef.current[0];
        const targetX = (nextCol - halfCols + 0.5) * floorTileSize;
        const targetZ = (nextRow - halfRows + 0.5) * floorTileSize;

        const dx = targetX - pos.worldX;
        const dz = targetZ - pos.worldZ;
        const dist = Math.hypot(dx, dz);

        if (dist <= pos.speed * 1.5) {
          pos.worldX = targetX;
          pos.worldZ = targetZ;
          pathRef.current.shift();
          if (pathRef.current.length === 0) {
            pos.isMoving = false;
          }
        } else {
          pos.isMoving = true;
          const stepX = (dx / dist) * pos.speed * 1.5;
          const stepZ = (dz / dist) * pos.speed * 1.5;
          pos.worldX += stepX;
          pos.worldZ += stepZ;
          pos.rotation = Math.atan2(dx, dz);
        }
      } else {
        pos.isMoving = false;
      }

      // Update Local 3D Avatar Position & Animation
      localAvatar3D.group.position.set(pos.worldX, 0, pos.worldZ);
      localAvatar3D.group.rotation.y = pos.rotation;

      // Bob walk animation
      if (pos.isMoving) {
        localAvatar3D.body.position.y = 0.8 + Math.sin(tick * 0.35) * 0.08;
      } else {
        localAvatar3D.body.position.y = 0.8;
      }

      // Speaking ring indicator
      const isLocalSpeaking = !!speakingMap["local"];
      localAvatar3D.ring.visible = isLocalSpeaking;
      if (isLocalSpeaking) {
        const pulse = 1 + Math.sin(tick * 0.2) * 0.15;
        localAvatar3D.ring.scale.set(pulse, pulse, pulse);
      }

      // Sync and Update Remote 3D Avatars
      for (const peer of remotePeers) {
        let avatar3D = remoteAvatars3D.get(peer.id);
        if (!avatar3D) {
          avatar3D = createAvatar3D(peer.name, peer.avatarColor, false);
          avatarsGroup.add(avatar3D.group);
          remoteAvatars3D.set(peer.id, avatar3D);
        }

        const targetX = (peer.x - halfCols + 0.5) * floorTileSize;
        const targetZ = (peer.y - halfRows + 0.5) * floorTileSize;

        avatar3D.group.position.x += (targetX - avatar3D.group.position.x) * 0.15;
        avatar3D.group.position.z += (targetZ - avatar3D.group.position.z) * 0.15;

        // Facing rotation
        let rot = 0;
        if (peer.dir === "left") rot = -Math.PI / 2;
        else if (peer.dir === "right") rot = Math.PI / 2;
        else if (peer.dir === "up") rot = Math.PI;
        avatar3D.group.rotation.y = rot;

        // Speaking ring
        const isSpeaking = !!speakingMap[peer.id];
        avatar3D.ring.visible = isSpeaking;
        if (isSpeaking) {
          const pulse = 1 + Math.sin(tick * 0.2) * 0.15;
          avatar3D.ring.scale.set(pulse, pulse, pulse);
        }
      }

      // Prune disconnected remote avatars
      for (const [id, avatar3D] of remoteAvatars3D.entries()) {
        if (!remotePeers.some((p) => p.id === id)) {
          avatarsGroup.remove(avatar3D.group);
          remoteAvatars3D.delete(id);
        }
      }

      // Current tile and zone check
      const curCol = Math.round(pos.worldX / floorTileSize + halfCols - 0.5);
      const curRow = Math.round(pos.worldZ / floorTileSize + halfRows - 0.5);
      pos.x = curCol;
      pos.y = curRow;

      const curZone = getZoneAt(curCol, curRow, map.zones);
      if (curZone?.id !== activeZone?.id) {
        setActiveZone(curZone);
      }

      // Movement network throttle
      if (tick % 3 === 0) {
        let dirName: PeerState["dir"] = "down";
        if (Math.abs(pos.rotation) < 0.5) dirName = "down";
        else if (Math.abs(pos.rotation - Math.PI) < 0.5) dirName = "up";
        else if (pos.rotation > 0) dirName = "right";
        else dirName = "left";

        onMove(curCol, curRow, dirName, pos.isMoving, curZone?.id || "open_desks");
      }

      // Check proximity to interactive objects
      let closestObj: InteractiveObject | null = null;
      for (const obj of map.objects) {
        const dist = Math.hypot(obj.x - curCol, obj.y - curRow);
        if (dist <= 1.8) {
          closestObj = obj;
          break;
        }
      }
      setNearbyObject(closestObj);

      // Smooth Isometric Camera Follow
      const targetCamX = pos.worldX;
      const targetCamY = 16.0;
      const targetCamZ = pos.worldZ + 18.0;

      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.lookAt(pos.worldX, 1.2, pos.worldZ);

      // Calculate screen positions for floating video bubbles
      if (onScreenPositionUpdate) {
        const screenPositions: Record<string, { screenX: number; screenY: number; inView: boolean }> = {};
        const all = [localPeer, ...remotePeers];

        for (const p of all) {
          const worldPoint = new THREE.Vector3(
            p.id === localPeer.id ? pos.worldX : (p.x - halfCols + 0.5) * floorTileSize,
            2.2,
            p.id === localPeer.id ? pos.worldZ : (p.y - halfRows + 0.5) * floorTileSize
          );

          worldPoint.project(camera);
          const screenX = ((worldPoint.x + 1) * container.clientWidth) / 2;
          const screenY = ((-worldPoint.y + 1) * container.clientHeight) / 2;
          const inView = worldPoint.z < 1 && screenX >= -50 && screenX <= container.clientWidth + 50;

          screenPositions[p.id] = { screenX, screenY, inView };
        }
        onScreenPositionUpdate(screenPositions);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", handlePointerDown);
      container.removeEventListener("touchstart", handlePointerDown);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [map, localPeer, remotePeers, speakingMap, onMove, onScreenPositionUpdate, activeZone]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-[#0B0C14]">
      {/* Floating Interaction Prompt */}
      {nearbyObject && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
          <div className="px-4 py-2 bg-surface border-2 border-accent rounded-control shadow-arcade flex items-center gap-2">
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

      {/* Current Zone Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="px-3 py-1.5 bg-surface/90 backdrop-blur-sm border border-border rounded-control shadow-sm flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeZone?.color || "#37E6C4" }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-display text-text font-semibold">
              {activeZone?.name || "Open Floor"}
            </span>
            {activeZone?.isPrivate ? (
              <span className="text-[10px] text-accent font-mono">
                🔒 Soundproof Room
              </span>
            ) : (
              <span className="text-[10px] text-text-muted font-mono">
                🧊 3D WebGL Engine
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
