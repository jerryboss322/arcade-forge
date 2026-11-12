"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useArcade } from "@/components/providers/ArcadeProvider";
import {
  type ForgeGameSchemaV1_1,
  type PalettePresetId,
  type EntityType,
  type EnemyBehavior,
  type Trigger,
  type Condition,
  type Action,
  PALETTE_PRESETS,
  STUDIO_LIMITS,
  checkPublishReadiness,
} from "@/lib/runtime/schema";
import {
  ForgeDeterministicRuntime,
  renderRoomStaticPreview,
  floodFill16x16,
  type InputState,
} from "@/lib/runtime/engine";
import { ForgeAudioEngine, randomizeSoundParam } from "@/lib/runtime/audio";
import {
  OFFICIAL_TEMPLATES,
  buildDungeonCrawlTemplate,
} from "@/lib/templates";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

type StudioTool =
  | "tile_brush"
  | "entity"
  | "pencil"
  | "eraser"
  | "fill"
  | "eyedropper";

type InspectorTab = "palette" | "entity" | "rules" | "audio";

const DRAFT_STORAGE_KEY = "arcadeforge_studio_active_draft_v1_1";

function StudioInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    games,
    jams,
    publishOrUpdateStudioGame,
    submitJamEntry,
    pushToast,
  } = useArcade();

  // Load initial document from ?remix=slug, ?template=id, or saved draft
  const [doc, setDoc] = useState<ForgeGameSchemaV1_1>(() =>
    buildDungeonCrawlTemplate()
  );
  const [remixedFromId, setRemixedFromId] = useState<string | undefined>(
    undefined
  );

  // Undo / Redo history stack (capped at 100 steps, stroke-grouped)
  const [undoStack, setUndoStack] = useState<ForgeGameSchemaV1_1[]>([]);
  const [redoStack, setRedoStack] = useState<ForgeGameSchemaV1_1[]>([]);
  const strokeSnapshotRef = useRef<ForgeGameSchemaV1_1 | null>(null);

  // UI state (stored separately from document undo stack — Section 1.2)
  const [activeTool, setActiveTool] = useState<StudioTool>("tile_brush");
  const [workspaceMode, setWorkspaceMode] = useState<"map" | "sprite">("map");
  const [activeRoomId, setActiveRoomId] = useState<string>("room_1");
  const [activeLayer, setActiveLayer] = useState<"ground" | "walls">("walls");
  const [selectedSpriteId, setSelectedSpriteId] =
    useState<string>("wall_stone");
  const [selectedColorIdx, setSelectedColorIdx] = useState<number>(8);
  const [activeSpriteFrame, setActiveSpriteFrame] = useState<number>(0);
  const [selectedEntityType, setSelectedEntityType] =
    useState<EntityType>("coin");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("palette");
  const [zoom, setZoom] = useState<number>(2); // Integer 1x..3x
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>("Saved");

  // Playtest state
  const [isPlaytesting, setIsPlaytesting] = useState<boolean>(false);
  const [showDebugHitboxes, setShowDebugHitboxes] = useState<boolean>(true);

  // Publish modal state
  const [publishModalOpen, setPublishModalOpen] = useState<boolean>(false);
  const [publishVisibility, setPublishVisibility] = useState<
    "PUBLISHED" | "UNLISTED" | "DRAFT"
  >("PUBLISHED");
  const [submitToActiveJam, setSubmitToActiveJam] = useState<boolean>(false);

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playtestCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ForgeDeterministicRuntime | null>(null);
  const sfxTesterRef = useRef<ForgeAudioEngine | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Check URL query params for ?remix= or ?template=
  useEffect(() => {
    const remixSlug = searchParams.get("remix");
    const templateId = searchParams.get("template");

    if (remixSlug) {
      const target = games.find((g) => g.slug === remixSlug);
      if (target?.projectData) {
        const cloned = structuredClone(target.projectData);
        cloned.title = `${target.title} (Remix)`;
        setDoc(cloned);
        setActiveRoomId(cloned.rooms[0]?.id || "room_1");
        setRemixedFromId(target.id);
        setUndoStack([]);
        setRedoStack([]);
        pushToast(`Loaded "${target.title}" for Remixing!`, "teal");
        return;
      }
    }

    if (templateId) {
      const tpl = OFFICIAL_TEMPLATES.find((t) => t.id === templateId);
      if (tpl) {
        const built = tpl.build();
        setDoc(built);
        setActiveRoomId(built.rooms[0]?.id || "room_1");
        setUndoStack([]);
        setRedoStack([]);
        pushToast(`Loaded template: ${tpl.name}`, "teal");
        return;
      }
    }

    // Otherwise check localStorage crash-recovery draft
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed?.schemaVersion === "1.1.0") {
          setDoc(parsed);
          setActiveRoomId(parsed.rooms[0]?.id || "room_1");
        }
      }
    } catch {
      // Ignore
    }
  }, [searchParams, games, pushToast]);

  // Debounced 2s Autosave + crash recovery mirror (Section 1.2)
  useEffect(() => {
    setSaveStatus("Saving...");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(doc));
        setSaveStatus("Saved 2s ago");
      } catch {
        setSaveStatus("Offline (local)");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [doc]);

  // Helper to commit a discrete edit onto the undo stack (max 100 steps)
  const commitEdit = useCallback(
    (updater: (draft: ForgeGameSchemaV1_1) => void) => {
      setDoc((prev) => {
        const next = structuredClone(prev);
        updater(next);
        setUndoStack((u) => [...u.slice(-99), prev]);
        setRedoStack([]);
        return next;
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const last = prevUndo[prevUndo.length - 1]!;
      setDoc((currDoc) => {
        setRedoStack((r) => [...r.slice(-99), currDoc]);
        return last;
      });
      return prevUndo.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1]!;
      setDoc((currDoc) => {
        setUndoStack((u) => [...u.slice(-99), currDoc]);
        return next;
      });
      return prevRedo.slice(0, -1);
    });
  }, []);

  // Keyboard shortcuts: Ctrl+Z, Ctrl+Shift+Z, B, E, G, I, T, N, Esc
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (isPlaytesting) {
        if (e.key === "Escape") {
          setIsPlaytesting(false);
          runtimeRef.current?.audio?.destroy();
        }
        return;
      }

      if (e.key === "b" || e.key === "B") {
        setActiveTool("pencil");
        setWorkspaceMode("sprite");
      } else if (e.key === "e" || e.key === "E") {
        setActiveTool("eraser");
      } else if (e.key === "g" || e.key === "G") {
        setActiveTool("fill");
        setWorkspaceMode("sprite");
      } else if (e.key === "i" || e.key === "I") {
        setActiveTool("eyedropper");
      } else if (e.key === "t" || e.key === "T") {
        setActiveTool("tile_brush");
        setWorkspaceMode("map");
      } else if (e.key === "n" || e.key === "N") {
        setActiveTool("entity");
        setWorkspaceMode("map");
        setInspectorTab("entity");
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedEntityId
      ) {
        commitEdit((draft) => {
          const rm = draft.rooms.find((r) => r.id === activeRoomId);
          if (rm) {
            rm.entities = rm.entities.filter((ent) => ent.id !== selectedEntityId);
          }
        });
        setSelectedEntityId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    isPlaytesting,
    selectedEntityId,
    activeRoomId,
    commitEdit,
  ]);

  const activeRoom = useMemo(
    () =>
      doc.rooms.find((r) => r.id === activeRoomId) || doc.rooms[0]!,
    [doc.rooms, activeRoomId]
  );

  const selectedEntity = useMemo(
    () =>
      activeRoom.entities.find((e) => e.id === selectedEntityId) || null,
    [activeRoom.entities, selectedEntityId]
  );

  // Run live Publish Readiness & BFS Reachability analysis (Section 1.9)
  const publishCheck = useMemo(() => checkPublishReadiness(doc), [doc]);

  // Render Room Map Canvas when in map mode
  useEffect(() => {
    if (isPlaytesting || workspaceMode !== "map") return;
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderRoomStaticPreview(ctx, doc, activeRoom.id, {
      showGrid,
      unreachableCoords: publishCheck.unreachableCoords,
      selectedEntityId,
    });
  }, [
    doc,
    activeRoom.id,
    showGrid,
    publishCheck.unreachableCoords,
    selectedEntityId,
    isPlaytesting,
    workspaceMode,
  ]);

  // Render 16x16 Sprite Editor Canvas when in sprite mode
  useEffect(() => {
    if (isPlaytesting || workspaceMode !== "sprite") return;
    const canvas = spriteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sp = doc.sprites[selectedSpriteId];
    if (!sp) return;
    const frame = sp.frames[activeSpriteFrame] || sp.frames[0] || new Array(256).fill(0);

    ctx.clearRect(0, 0, 256, 256);
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < 256; i++) {
      const cIdx = frame[i] ?? 0;
      const x = (i % 16) * 16;
      const y = Math.floor(i / 16) * 16;
      if (cIdx > 0) {
        const hex = doc.palette[cIdx];
        if (hex && hex !== "transparent") {
          ctx.fillStyle = hex;
          ctx.fillRect(x, y, 16, 16);
        }
      }
      if (showGrid) {
        ctx.strokeStyle = "rgba(237, 238, 255, 0.14)";
        ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
      }
    }
  }, [
    doc,
    selectedSpriteId,
    activeSpriteFrame,
    showGrid,
    isPlaytesting,
    workspaceMode,
  ]);

  // Playtest loop using shared ForgeDeterministicRuntime
  useEffect(() => {
    if (!isPlaytesting) {
      runtimeRef.current?.audio?.destroy();
      runtimeRef.current = null;
      return;
    }

    const rt = new ForgeDeterministicRuntime(doc, true);
    rt.audio?.startMusic(doc.feel.musicTrack);
    runtimeRef.current = rt;

    const input: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") input.down = true;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = true;
      if (e.key === " " || e.key === "z" || e.key === "Z") input.action = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") input.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") input.down = false;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") input.right = false;
      if (e.key === " " || e.key === "z" || e.key === "Z") input.action = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedDt = 1000 / 60;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const delta = Math.min(100, now - lastTime);
      lastTime = now;
      accumulator += delta;

      while (accumulator >= fixedDt) {
        rt.step(input);
        accumulator -= fixedDt;
      }

      const canvas = playtestCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          rt.render(ctx, showDebugHitboxes);
        }
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      rt.audio?.destroy();
    };
  }, [isPlaytesting, doc, showDebugHitboxes]);

  // Map Canvas Pointer Interaction (stroke-grouped undo + setPointerCapture)
  const applyMapToolAt = (tileX: number, tileY: number, isInitialClick: boolean) => {
    if (tileX < 0 || tileX >= 20 || tileY < 0 || tileY >= 15) return;

    if (activeTool === "tile_brush") {
      setDoc((prev) => {
        const next = structuredClone(prev);
        const rm = next.rooms.find((r) => r.id === activeRoom.id);
        if (!rm) return prev;
        const idx = tileY * 20 + tileX;
        if (activeLayer === "ground") {
          rm.ground[idx] = selectedSpriteId;
        } else {
          rm.walls[idx] = selectedSpriteId;
        }
        return next;
      });
    } else if (activeTool === "eraser") {
      setDoc((prev) => {
        const next = structuredClone(prev);
        const rm = next.rooms.find((r) => r.id === activeRoom.id);
        if (!rm) return prev;
        const idx = tileY * 20 + tileX;
        if (activeLayer === "ground") {
          rm.ground[idx] = "";
        } else {
          rm.walls[idx] = "";
        }
        return next;
      });
    } else if (activeTool === "eyedropper" && isInitialClick) {
      const idx = tileY * 20 + tileX;
      const picked =
        activeRoom.walls[idx] || activeRoom.ground[idx];
      if (picked) {
        setSelectedSpriteId(picked);
        setActiveTool("tile_brush");
      }
    } else if (activeTool === "entity" && isInitialClick) {
      // Check if an entity already exists at (tileX, tileY)
      const existing = activeRoom.entities.find(
        (e) => e.x === tileX && e.y === tileY
      );
      if (existing) {
        setSelectedEntityId(existing.id);
        setInspectorTab("entity");
        return;
      }

      if (activeRoom.entities.length >= STUDIO_LIMITS.maxEntitiesPerRoom) {
        pushToast("Room entity limit (100) reached!", "warn");
        return;
      }

      const defaultSpriteByType: Record<EntityType, string> = {
        player: "knight",
        coin: "coin",
        key: "key_gold",
        door: "door_locked",
        exit: "exit_portal",
        hazard: "spikes_hazard",
        enemy: "slime_enemy",
        npc: "wizard_npc",
      };

      const newId = `ent_${Date.now().toString(36)}`;
      const spriteToUse =
        doc.sprites[defaultSpriteByType[selectedEntityType]]
          ? defaultSpriteByType[selectedEntityType]
          : selectedSpriteId;

      commitEdit((draft) => {
        const rm = draft.rooms.find((r) => r.id === activeRoom.id);
        if (!rm) return;
        // If placing player in start room, move existing player instead of duplicating
        if (selectedEntityType === "player") {
          const existingPlayer = rm.entities.find((e) => e.type === "player");
          if (existingPlayer) {
            existingPlayer.x = tileX;
            existingPlayer.y = tileY;
            setSelectedEntityId(existingPlayer.id);
            return;
          }
        }
        rm.entities.push({
          id: newId,
          type: selectedEntityType,
          x: tileX,
          y: tileY,
          spriteId: spriteToUse,
          health: selectedEntityType === "player" ? 3 : undefined,
          speed: selectedEntityType === "player" ? 78 : 46,
          value: selectedEntityType === "coin" ? 10 : undefined,
          lockId:
            selectedEntityType === "key" || selectedEntityType === "door"
              ? "gold"
              : undefined,
          behavior: selectedEntityType === "enemy" ? "patrol" : undefined,
          patrolAxis: "x",
          patrolDist: 4,
          dialogue:
            selectedEntityType === "npc"
              ? ["Greetings traveler! Beware the dungeon hazards."]
              : undefined,
        });
      });
      setSelectedEntityId(newId);
      setInspectorTab("entity");
    }
  };

  const handleMapPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    strokeSnapshotRef.current = structuredClone(doc);

    const rect = e.currentTarget.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - rect.left) / rect.width) * 20);
    const ty = Math.floor(((e.clientY - rect.top) / rect.height) * 15);
    applyMapToolAt(tx, ty, true);
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (activeTool !== "tile_brush" && activeTool !== "eraser") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - rect.left) / rect.width) * 20);
    const ty = Math.floor(((e.clientY - rect.top) / rect.height) * 15);
    applyMapToolAt(tx, ty, false);
  };

  const handleMapPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (
      strokeSnapshotRef.current &&
      (activeTool === "tile_brush" || activeTool === "eraser")
    ) {
      const snap = strokeSnapshotRef.current;
      setUndoStack((u) => [...u.slice(-99), snap]);
      setRedoStack([]);
      strokeSnapshotRef.current = null;
    }
  };

  // Sprite 16x16 Editor Pointer Interaction
  const applySpriteToolAt = (px: number, py: number, isClick: boolean) => {
    if (px < 0 || px >= 16 || py < 0 || py >= 16) return;
    const sp = doc.sprites[selectedSpriteId];
    if (!sp) return;

    if (activeTool === "eyedropper" && isClick) {
      const frame = sp.frames[activeSpriteFrame] || sp.frames[0]!;
      const picked = frame[py * 16 + px] ?? 0;
      setSelectedColorIdx(picked);
      setActiveTool("pencil");
      return;
    }

    if (activeTool === "fill" && isClick) {
      commitEdit((draft) => {
        const targetSp = draft.sprites[selectedSpriteId];
        if (!targetSp) return;
        const currFrame = targetSp.frames[activeSpriteFrame] || targetSp.frames[0]!;
        targetSp.frames[activeSpriteFrame] = floodFill16x16(
          currFrame,
          px,
          py,
          selectedColorIdx
        );
      });
      return;
    }

    const colorToSet = activeTool === "eraser" ? 0 : selectedColorIdx;
    setDoc((prev) => {
      const next = structuredClone(prev);
      const targetSp = next.sprites[selectedSpriteId];
      if (!targetSp) return prev;
      if (!targetSp.frames[activeSpriteFrame]) {
        targetSp.frames[activeSpriteFrame] = new Array(256).fill(0);
      }
      targetSp.frames[activeSpriteFrame]![py * 16 + px] = colorToSet;
      return next;
    });
  };

  const handleSpritePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    strokeSnapshotRef.current = structuredClone(doc);

    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.floor(((e.clientX - rect.left) / rect.width) * 16);
    const py = Math.floor(((e.clientY - rect.top) / rect.height) * 16);
    applySpriteToolAt(px, py, true);
  };

  const handleSpritePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (activeTool !== "pencil" && activeTool !== "eraser") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.floor(((e.clientX - rect.left) / rect.width) * 16);
    const py = Math.floor(((e.clientY - rect.top) / rect.height) * 16);
    applySpriteToolAt(px, py, false);
  };

  const handleSpritePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (
      strokeSnapshotRef.current &&
      (activeTool === "pencil" || activeTool === "eraser")
    ) {
      const snap = strokeSnapshotRef.current;
      setUndoStack((u) => [...u.slice(-99), snap]);
      setRedoStack([]);
      strokeSnapshotRef.current = null;
    }
  };

  const handleSwitchPalettePreset = (presetId: PalettePresetId) => {
    commitEdit((draft) => {
      draft.paletteId = presetId;
      draft.palette = [...PALETTE_PRESETS[presetId].colors];
    });
    pushToast(
      `Remapped palette by index to ${PALETTE_PRESETS[presetId].name}`,
      "teal"
    );
  };

  const handleAddRoom = () => {
    if (doc.rooms.length >= STUDIO_LIMITS.maxRooms) {
      pushToast(`Maximum of ${STUDIO_LIMITS.maxRooms} rooms reached.`, "warn");
      return;
    }
    const newId = `room_${doc.rooms.length + 1}_${Date.now().toString(36).slice(-2)}`;
    const newName = `Room ${doc.rooms.length + 1}`;
    commitEdit((draft) => {
      const ground = new Array(300).fill("floor_tile");
      const walls = new Array(300).fill("");
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 20; c++) {
          if (r === 0 || r === 14 || c === 0 || c === 19) {
            walls[r * 20 + c] = "wall_stone";
          }
        }
      }
      draft.rooms.push({
        id: newId,
        name: newName,
        isStart: false,
        cols: 20,
        rows: 15,
        ground,
        walls,
        entities: [],
      });
    });
    setActiveRoomId(newId);
  };

  const handlePublishConfirm = () => {
    if (publishVisibility === "PUBLISHED" && !publishCheck.valid) {
      pushToast("Fix blocking publish errors first!", "danger");
      return;
    }

    const published = publishOrUpdateStudioGame({
      doc,
      status: publishVisibility,
      remixedFromId,
      versionLabel: `Published v1.1 (${new Date().toLocaleTimeString()})`,
    });

    if (submitToActiveJam && jams[0]) {
      submitJamEntry(jams[0].id, published.id);
    }

    setPublishModalOpen(false);
    pushToast(`"${published.title}" saved as ${publishVisibility}!`, "teal");
    router.push(`/game/${published.slug}`);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-bg">
      {/* Mobile "Best on Desktop" Notice (Section 1.1 of Deep Dive & Section 4 of UI Spec) */}
      <div className="md:hidden bg-surface-2 border-b-2 border-warn px-4 py-2 text-xs text-warn font-semibold text-center">
        💻 Forge Studio is designed for desktop precision. You can still preview and tweak here!
      </div>

      {/* Studio Top Bar (48px — Section 4 of UI Spec) */}
      <div className="min-h-[48px] px-4 py-1.5 bg-surface border-b-2 border-border flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title Input + Template Picker */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={doc.title}
            maxLength={STUDIO_LIMITS.maxTitleChars}
            onChange={(e) => {
              const val = e.target.value;
              setDoc((prev) => ({ ...prev, title: val }));
            }}
            aria-label="Game title"
            className="h-8 px-2.5 rounded-control bg-surface-2 border-2 border-border focus:border-accent text-sm font-bold text-text w-48 sm:w-60"
          />

          <select
            aria-label="Load starter template"
            defaultValue=""
            onChange={(e) => {
              const tpl = OFFICIAL_TEMPLATES.find((t) => t.id === e.target.value);
              if (tpl) {
                const built = tpl.build();
                setDoc(built);
                setActiveRoomId(built.rooms[0]?.id || "room_1");
                setUndoStack([]);
                setRedoStack([]);
                pushToast(`Loaded template: ${tpl.name}`, "teal");
              }
            }}
            className="h-8 px-2.5 rounded-control bg-surface-2 border-2 border-border text-xs font-semibold text-text-muted hover:text-text"
          >
            <option value="" disabled>
              Load Template...
            </option>
            {OFFICIAL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Undo / Redo + Save Status + BFS Check Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="h-8 px-2.5 rounded-control bg-surface-2 border-2 border-border disabled:opacity-40 hover:border-accent text-xs font-mono text-text"
          >
            ↶ Undo ({undoStack.length})
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            className="h-8 px-2.5 rounded-control bg-surface-2 border-2 border-border disabled:opacity-40 hover:border-accent text-xs font-mono text-text"
          >
            ↷ Redo ({redoStack.length})
          </button>

          <span className="hidden lg:inline-block px-2.5 py-1 rounded bg-bg border border-border text-[11px] font-mono text-text-muted">
            {saveStatus}
          </span>

          {/* Live Publish & BFS Reachability Status Pill */}
          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className={`h-8 px-2.5 rounded-control border-2 text-xs font-mono font-bold ${
              !publishCheck.valid
                ? "bg-danger/20 border-danger text-danger"
                : publishCheck.warnings.length > 0
                ? "bg-warn/20 border-warn text-warn"
                : "bg-accent-2/20 border-accent-2 text-accent-2"
            }`}
          >
            {!publishCheck.valid
              ? `✕ ${publishCheck.blockingErrors.length} Blocking`
              : publishCheck.warnings.length > 0
              ? `⚠ ${publishCheck.warnings.length} Reachability Warn`
              : "✓ Valid v1.1"}
          </button>
        </div>

        {/* Right: Playtest Toggle + Publish Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPlaytesting((p) => !p)}
            className={`h-8 px-4 rounded-control font-display text-xs uppercase font-bold border-2 border-black shadow-arcade-sm transition-all ${
              isPlaytesting
                ? "bg-warn text-bg"
                : "bg-accent-2 text-bg hover:brightness-110"
            }`}
          >
            {isPlaytesting ? "■ Stop Playtest (Esc)" : "▶ Playtest"}
          </button>

          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className="h-8 px-4 rounded-control bg-accent hover:brightness-110 text-bg font-display text-xs uppercase font-bold border-2 border-black shadow-arcade-sm"
          >
            Publish ↑
          </button>
        </div>
      </div>

      {/* Main 3-Pane Studio Workspace: Left Rail (72px) + Center Canvas + Right Inspector (310px) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT RAIL (72px on desktop — Section 4 of UI Spec) */}
        <aside className="lg:w-[76px] bg-surface border-b-2 lg:border-b-0 lg:border-r-2 border-border p-2 flex lg:flex-col items-center justify-start gap-2 overflow-x-auto">
          {[
            {
              id: "tile_brush" as StudioTool,
              label: "Tiles (T)",
              icon: "🧱",
              mode: "map" as const,
            },
            {
              id: "entity" as StudioTool,
              label: "Entity (N)",
              icon: "👾",
              mode: "map" as const,
            },
            {
              id: "pencil" as StudioTool,
              label: "Pencil (B)",
              icon: "✏️",
              mode: "sprite" as const,
            },
            {
              id: "fill" as StudioTool,
              label: "Fill (G)",
              icon: "🪣",
              mode: "sprite" as const,
            },
            {
              id: "eraser" as StudioTool,
              label: "Erase (E)",
              icon: "⌫",
              mode: null,
            },
            {
              id: "eyedropper" as StudioTool,
              label: "Pick (I)",
              icon: "💧",
              mode: null,
            },
          ].map((tool) => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.mode) setWorkspaceMode(tool.mode);
                  if (tool.id === "entity") setInspectorTab("entity");
                }}
                className={`w-14 h-14 rounded-control border-2 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold shrink-0 transition-all ${
                  active
                    ? "bg-accent text-bg border-black shadow-arcade-sm"
                    : "bg-surface-2 text-text-muted border-border hover:text-text"
                }`}
              >
                <span className="text-base">{tool.icon}</span>
                <span>{tool.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </aside>

        {/* CENTER CANVAS WORKSPACE */}
        <section className="flex-1 flex flex-col bg-bg min-w-0 overflow-auto">
          {/* Sub-toolbar: Workspace Mode (Room Map vs 16x16 Sprite), Rooms, Layer, Integer Zoom */}
          <div className="px-4 py-2 bg-surface-2 border-b-2 border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-control border-2 border-border bg-bg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaytesting(false);
                    setWorkspaceMode("map");
                    if (activeTool === "pencil" || activeTool === "fill") {
                      setActiveTool("tile_brush");
                    }
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    workspaceMode === "map" && !isPlaytesting
                      ? "bg-accent text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  🗺️ Room Map (20×15)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaytesting(false);
                    setWorkspaceMode("sprite");
                    if (activeTool === "tile_brush" || activeTool === "entity") {
                      setActiveTool("pencil");
                    }
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    workspaceMode === "sprite" && !isPlaytesting
                      ? "bg-accent text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  🎨 16×16 Sprite Editor
                </button>
              </div>

              {workspaceMode === "map" && !isPlaytesting && (
                <>
                  {/* Layer Selector */}
                  <div className="inline-flex rounded-control border-2 border-border bg-bg p-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveLayer("ground")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        activeLayer === "ground"
                          ? "bg-accent-2 text-bg"
                          : "text-text-muted"
                      }`}
                    >
                      Ground
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLayer("walls")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        activeLayer === "walls"
                          ? "bg-accent-2 text-bg"
                          : "text-text-muted"
                      }`}
                    >
                      Solid Walls
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right controls: Grid & Integer Zoom (1x, 2x, 3x) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                className={`px-2.5 py-1 rounded border font-mono text-xs ${
                  showGrid
                    ? "bg-surface border-accent-2 text-accent-2"
                    : "bg-bg border-border text-text-muted"
                }`}
              >
                # Grid
              </button>

              <div className="flex items-center gap-1 font-mono">
                {[1, 2, 3].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={`px-2 py-1 rounded border text-xs ${
                      zoom === z
                        ? "bg-accent text-bg border-black font-bold"
                        : "bg-bg border-border text-text-muted"
                    }`}
                  >
                    {z}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Room Tabs Bar (Up to 10 Rooms — Section 1.5 of Deep Dive) */}
          <div className="px-4 py-1.5 bg-surface border-b border-border flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-mono text-text-muted shrink-0">
              ROOMS ({doc.rooms.length}/{STUDIO_LIMITS.maxRooms}):
            </span>
            {doc.rooms.map((rm) => (
              <button
                key={rm.id}
                type="button"
                onClick={() => {
                  setActiveRoomId(rm.id);
                  setSelectedEntityId(null);
                }}
                className={`px-3 py-1 rounded-control border text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                  rm.id === activeRoom.id
                    ? "bg-surface-2 border-accent text-text"
                    : "bg-bg border-border text-text-muted hover:text-text"
                }`}
              >
                {rm.isStart && (
                  <span title="Start Room" className="text-warn">
                    ★
                  </span>
                )}
                <span>{rm.name}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddRoom}
              className="px-2.5 py-1 rounded-control bg-surface-2 hover:border-accent-2 border border-border text-xs font-semibold text-accent-2 shrink-0"
            >
              + New Room
            </button>
          </div>

          {/* Center Canvas Stage */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
            {isPlaytesting ? (
              /* IN-PLACE PLAYTEST RUNNER (Section 1.9: replaces canvas in place, Esc to return) */
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full max-w-[640px] px-3 py-1.5 rounded-control bg-surface border-2 border-accent-2 text-xs">
                  <span className="font-display text-accent-2 uppercase">
                    ▶ Live Playtest (Shared 60Hz Deterministic Runtime)
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDebugHitboxes}
                        onChange={(e) => setShowDebugHitboxes(e.target.checked)}
                      />
                      <span>Debug Hitboxes</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPlaytesting(false)}
                      className="px-2 py-0.5 rounded bg-surface-2 border border-border text-text font-mono"
                    >
                      Esc to Exit
                    </button>
                  </div>
                </div>

                <div
                  style={{ width: 320 * zoom, height: 240 * zoom }}
                  className="rounded-card border-2 border-accent-2 shadow-arcade-lg overflow-hidden bg-bg"
                >
                  <canvas
                    ref={playtestCanvasRef}
                    width={320}
                    height={240}
                    className="w-full h-full block pixelated"
                  />
                </div>
              </div>
            ) : workspaceMode === "map" ? (
              /* ROOM TILEMAP & ENTITY CANVAS */
              <div className="flex flex-col items-center gap-3">
                <div
                  style={{ width: 320 * zoom, height: 240 * zoom }}
                  className="rounded-card border-2 border-border shadow-arcade-lg overflow-hidden checkerboard"
                >
                  <canvas
                    ref={mapCanvasRef}
                    width={320}
                    height={240}
                    onPointerDown={handleMapPointerDown}
                    onPointerMove={handleMapPointerMove}
                    onPointerUp={handleMapPointerUp}
                    style={{ touchAction: "none" }}
                    className="w-full h-full block pixelated cursor-crosshair"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted font-mono">
                  <span>
                    Active Tool:{" "}
                    <strong className="text-accent uppercase">
                      {activeTool}
                    </strong>
                  </span>
                  <span>
                    Layer:{" "}
                    <strong className="text-accent-2 uppercase">
                      {activeTool === "entity" ? "entities" : activeLayer}
                    </strong>
                  </span>
                  <span>
                    Entities in Room: {activeRoom.entities.length} /{" "}
                    {STUDIO_LIMITS.maxEntitiesPerRoom}
                  </span>
                </div>
              </div>
            ) : (
              /* 16x16 PIXEL SPRITE EDITOR + 4-FRAME TIMELINE */
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-display uppercase text-accent">
                    Editing Sprite: {doc.sprites[selectedSpriteId]?.name} (16×16)
                  </span>
                  <span className="font-mono text-text-muted">
                    Color Index #{selectedColorIdx} (
                    {selectedColorIdx === 0
                      ? "Transparent"
                      : doc.palette[selectedColorIdx]}
                    )
                  </span>
                </div>

                <div className="w-[320px] h-[320px] rounded-card border-2 border-border shadow-arcade-lg overflow-hidden checkerboard">
                  <canvas
                    ref={spriteCanvasRef}
                    width={256}
                    height={256}
                    onPointerDown={handleSpritePointerDown}
                    onPointerMove={handleSpritePointerMove}
                    onPointerUp={handleSpritePointerUp}
                    style={{ touchAction: "none" }}
                    className="w-full h-full block pixelated cursor-crosshair"
                  />
                </div>

                {/* Animation Frames Bar (Up to 4 frames, 1-12 FPS — Section 1.4) */}
                {doc.sprites[selectedSpriteId] && (
                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-card bg-surface border-2 border-border">
                    <span className="text-xs font-semibold text-text-muted">
                      Frames ({doc.sprites[selectedSpriteId]!.frames.length}/4):
                    </span>
                    {doc.sprites[selectedSpriteId]!.frames.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSpriteFrame(idx)}
                        className={`px-3 py-1 rounded-control text-xs font-mono border-2 ${
                          activeSpriteFrame === idx
                            ? "bg-accent text-bg border-black font-bold"
                            : "bg-surface-2 text-text border-border"
                        }`}
                      >
                        Frame {idx + 1}
                      </button>
                    ))}
                    {doc.sprites[selectedSpriteId]!.frames.length < 4 && (
                      <button
                        type="button"
                        onClick={() => {
                          commitEdit((draft) => {
                            const s = draft.sprites[selectedSpriteId];
                            if (s && s.frames.length < 4) {
                              s.frames.push([
                                ...(s.frames[s.frames.length - 1] ||
                                  new Array(256).fill(0)),
                              ]);
                            }
                          });
                        }}
                        className="px-2.5 py-1 rounded-control bg-surface-2 border border-border text-xs text-accent-2 font-semibold"
                      >
                        + Clone Frame
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 pl-2 border-l border-border text-xs">
                      <span className="text-text-muted">FPS:</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={doc.sprites[selectedSpriteId]!.fps}
                        onChange={(e) => {
                          const fps = Math.max(
                            1,
                            Math.min(12, Number(e.target.value) || 4)
                          );
                          commitEdit((draft) => {
                            if (draft.sprites[selectedSpriteId]) {
                              draft.sprites[selectedSpriteId]!.fps = fps;
                            }
                          });
                        }}
                        className="w-14 h-7 px-2 rounded bg-surface-2 border border-border font-mono text-text"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT INSPECTOR PANEL (310px — Section 4 of UI Spec) */}
        <aside className="w-full lg:w-[320px] bg-surface border-t-2 lg:border-t-0 lg:border-l-2 border-border flex flex-col shrink-0">
          {/* Inspector Tabs */}
          <div className="grid grid-cols-4 border-b-2 border-border bg-surface-2 text-[11px] font-semibold">
            {(
              [
                { id: "palette", label: "Palette" },
                { id: "entity", label: "Entities" },
                { id: "rules", label: "Rules" },
                { id: "audio", label: "Audio/Feel" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInspectorTab(tab.id)}
                className={`py-2.5 text-center border-b-2 transition-colors ${
                  inspectorTab === tab.id
                    ? "border-accent text-accent bg-surface font-bold"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] text-xs">
            {/* TAB 1: PALETTE (4x4 32px swatches) & SPRITES */}
            {inspectorTab === "palette" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display uppercase text-text">
                      16-Color Palette
                    </span>
                    <select
                      value={doc.paletteId}
                      onChange={(e) =>
                        handleSwitchPalettePreset(
                          e.target.value as PalettePresetId
                        )
                      }
                      aria-label="Palette preset"
                      className="h-7 px-2 rounded bg-surface-2 border border-border text-xs text-text"
                    >
                      <option value="pico8">PICO-8 Classic</option>
                      <option value="gameboy">Pocket DMG Green</option>
                      <option value="neon">Cyber Arcade Neon</option>
                    </select>
                  </div>

                  {/* 4x4 Swatch Grid (32px each, index 0 = transparent checkerboard) */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {doc.palette.map((hex, idx) => {
                      const selected = selectedColorIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedColorIdx(idx)}
                          title={
                            idx === 0
                              ? "Index 0: Transparent"
                              : `Index ${idx}: ${hex}`
                          }
                          style={
                            idx === 0 ? undefined : { backgroundColor: hex }
                          }
                          className={`h-8 rounded-control border-2 flex items-center justify-center font-mono text-[10px] ${
                            idx === 0 ? "checkerboard text-text" : ""
                          } ${
                            selected
                              ? "border-accent ring-2 ring-accent"
                              : "border-border"
                          }`}
                        >
                          {idx === 0 ? "0:TR" : idx}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sprite Library List */}
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display uppercase text-text">
                      Sprites ({Object.keys(doc.sprites).length}/
                      {STUDIO_LIMITS.maxSprites})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `custom_${
                          Object.keys(doc.sprites).length + 1
                        }`;
                        commitEdit((draft) => {
                          draft.sprites[newId] = {
                            id: newId,
                            name: `Custom ${
                              Object.keys(draft.sprites).length + 1
                            }`,
                            fps: 4,
                            frames: [new Array(256).fill(0)],
                          };
                        });
                        setSelectedSpriteId(newId);
                        setWorkspaceMode("sprite");
                        setActiveTool("pencil");
                      }}
                      className="px-2 py-1 rounded bg-accent text-bg font-semibold text-[11px]"
                    >
                      + New Sprite
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(doc.sprites).map((sp) => {
                      const active = selectedSpriteId === sp.id;
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => {
                            setSelectedSpriteId(sp.id);
                            setActiveSpriteFrame(0);
                          }}
                          className={`p-2 rounded-control border-2 text-left truncate flex items-center justify-between ${
                            active
                              ? "bg-surface-2 border-accent text-text font-bold"
                              : "bg-bg border-border text-text-muted hover:text-text"
                          }`}
                        >
                          <span className="truncate">{sp.name}</span>
                          <span className="text-[10px] font-mono opacity-70">
                            {sp.frames.length}f
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ENTITIES & BEHAVIORS */}
            {inspectorTab === "entity" && (
              <div className="space-y-4">
                <div>
                  <label className="block font-display uppercase text-text mb-1.5">
                    Entity Type to Place
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        "player",
                        "coin",
                        "key",
                        "door",
                        "exit",
                        "hazard",
                        "enemy",
                        "npc",
                      ] as EntityType[]
                    ).map((et) => (
                      <button
                        key={et}
                        type="button"
                        onClick={() => {
                          setSelectedEntityType(et);
                          setActiveTool("entity");
                          setWorkspaceMode("map");
                        }}
                        className={`px-2.5 py-1.5 rounded-control border text-left uppercase font-mono text-[11px] ${
                          selectedEntityType === et && activeTool === "entity"
                            ? "bg-accent text-bg border-black font-bold"
                            : "bg-surface-2 border-border text-text-muted hover:text-text"
                        }`}
                      >
                        + {et}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Entity Properties */}
                {selectedEntity ? (
                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display uppercase text-accent-2">
                        Selected: {selectedEntity.type} ({selectedEntity.x},{" "}
                        {selectedEntity.y})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          commitEdit((draft) => {
                            const rm = draft.rooms.find(
                              (r) => r.id === activeRoom.id
                            );
                            if (rm) {
                              rm.entities = rm.entities.filter(
                                (e) => e.id !== selectedEntity.id
                              );
                            }
                          });
                          setSelectedEntityId(null);
                        }}
                        className="px-2 py-0.5 rounded bg-danger text-bg font-semibold text-[11px]"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Sprite selector for entity */}
                    <div>
                      <label className="block text-text-muted mb-1">
                        Sprite
                      </label>
                      <select
                        value={selectedEntity.spriteId}
                        onChange={(e) => {
                          const val = e.target.value;
                          commitEdit((draft) => {
                            const rm = draft.rooms.find(
                              (r) => r.id === activeRoom.id
                            );
                            const ent = rm?.entities.find(
                              (x) => x.id === selectedEntity.id
                            );
                            if (ent) ent.spriteId = val;
                          });
                        }}
                        className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text"
                      >
                        {Object.values(doc.sprites).map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Enemy AI Behavior Dropdown (Patrol, Chase, Wander, Shooter, Stationary) */}
                    {selectedEntity.type === "enemy" && (
                      <>
                        <div>
                          <label className="block text-text-muted mb-1">
                            Enemy AI Behavior (Section 1.6)
                          </label>
                          <select
                            value={selectedEntity.behavior || "patrol"}
                            onChange={(e) => {
                              const beh = e.target.value as EnemyBehavior;
                              commitEdit((draft) => {
                                const rm = draft.rooms.find(
                                  (r) => r.id === activeRoom.id
                                );
                                const ent = rm?.entities.find(
                                  (x) => x.id === selectedEntity.id
                                );
                                if (ent) ent.behavior = beh;
                              });
                            }}
                            className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text"
                          >
                            <option value="patrol">Patrol (Axis & Distance)</option>
                            <option value="chase">Chase Player (Radius)</option>
                            <option value="wander">Wander (Seeded RNG)</option>
                            <option value="shooter">Shooter (Turret)</option>
                            <option value="stationary">Stationary Guard</option>
                          </select>
                        </div>

                        {selectedEntity.behavior === "patrol" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-text-muted mb-1">
                                Axis
                              </label>
                              <select
                                value={selectedEntity.patrolAxis || "x"}
                                onChange={(e) => {
                                  const ax = e.target.value as "x" | "y";
                                  commitEdit((draft) => {
                                    const ent = draft.rooms
                                      .find((r) => r.id === activeRoom.id)
                                      ?.entities.find(
                                        (x) => x.id === selectedEntity.id
                                      );
                                    if (ent) ent.patrolAxis = ax;
                                  });
                                }}
                                className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text"
                              >
                                <option value="x">Horizontal (X)</option>
                                <option value="y">Vertical (Y)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-text-muted mb-1">
                                Tiles Dist
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={15}
                                value={selectedEntity.patrolDist ?? 4}
                                onChange={(e) => {
                                  const d = Number(e.target.value) || 3;
                                  commitEdit((draft) => {
                                    const ent = draft.rooms
                                      .find((r) => r.id === activeRoom.id)
                                      ?.entities.find(
                                        (x) => x.id === selectedEntity.id
                                      );
                                    if (ent) ent.patrolDist = d;
                                  });
                                }}
                                className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Key / Door Lock ID & Room Link */}
                    {(selectedEntity.type === "key" ||
                      selectedEntity.type === "door") && (
                      <div>
                        <label className="block text-text-muted mb-1">
                          Lock ID (matches Key ↔ Door)
                        </label>
                        <input
                          type="text"
                          value={selectedEntity.lockId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            commitEdit((draft) => {
                              const ent = draft.rooms
                                .find((r) => r.id === activeRoom.id)
                                ?.entities.find(
                                  (x) => x.id === selectedEntity.id
                                );
                              if (ent) ent.lockId = val;
                            });
                          }}
                          className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text font-mono"
                        />
                      </div>
                    )}

                    {selectedEntity.type === "door" && (
                      <div>
                        <label className="block text-text-muted mb-1">
                          Transition to Room (Optional)
                        </label>
                        <select
                          value={selectedEntity.targetRoom || ""}
                          onChange={(e) => {
                            const val = e.target.value || undefined;
                            commitEdit((draft) => {
                              const ent = draft.rooms
                                .find((r) => r.id === activeRoom.id)
                                ?.entities.find(
                                  (x) => x.id === selectedEntity.id
                                );
                              if (ent) {
                                ent.targetRoom = val;
                                ent.targetX = 2;
                                ent.targetY = 7;
                              }
                            });
                          }}
                          className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text"
                        >
                          <option value="">Opens in place (no warp)</option>
                          {doc.rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Warp to: {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedEntity.type === "npc" && (
                      <div>
                        <label className="block text-text-muted mb-1">
                          NPC Dialogue Line
                        </label>
                        <textarea
                          rows={2}
                          value={(selectedEntity.dialogue || [])[0] || ""}
                          onChange={(e) => {
                            const line = e.target.value;
                            commitEdit((draft) => {
                              const ent = draft.rooms
                                .find((r) => r.id === activeRoom.id)
                                ?.entities.find(
                                  (x) => x.id === selectedEntity.id
                                );
                              if (ent) ent.dialogue = [line];
                            });
                          }}
                          className="w-full p-2 rounded bg-surface-2 border border-border text-text"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-text-muted pt-2 border-t border-border">
                    Click any tile on the map with the{" "}
                    <strong className="text-text">Entity (N)</strong> tool to place or inspect an entity.
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: RULE BUILDER (When -> If -> Then) */}
            {inspectorTab === "rules" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display uppercase text-text">
                    Rules ({doc.rules.length}/{STUDIO_LIMITS.maxRules})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (doc.rules.length >= STUDIO_LIMITS.maxRules) return;
                      commitEdit((draft) => {
                        draft.rules.push({
                          id: `rule_${Date.now().toString(36)}`,
                          name: "Win when all coins collected",
                          trigger: { kind: "allCollected", entityType: "coin" },
                          condition: { kind: "always" },
                          actions: [
                            { kind: "playSound", soundId: "win" },
                            { kind: "win" },
                          ],
                        });
                      });
                    }}
                    className="px-2 py-1 rounded bg-accent text-bg font-semibold text-[11px]"
                  >
                    + Add Rule
                  </button>
                </div>

                <p className="text-[11px] text-text-muted">
                  Loop-safe: actions execute on the next 60Hz tick (cap 200/frame).
                </p>

                <div className="space-y-2.5">
                  {doc.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-2.5 rounded-control bg-surface-2 border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            commitEdit((draft) => {
                              const r = draft.rules.find(
                                (x) => x.id === rule.id
                              );
                              if (r) r.name = val;
                            });
                          }}
                          className="flex-1 bg-bg px-2 py-1 rounded border border-border text-text font-semibold text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            commitEdit((draft) => {
                              draft.rules = draft.rules.filter(
                                (x) => x.id !== rule.id
                              );
                            });
                          }}
                          className="text-danger hover:underline text-[11px]"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Trigger Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-accent font-bold w-12">
                          WHEN:
                        </span>
                        <select
                          value={rule.trigger.kind}
                          onChange={(e) => {
                            const k = e.target.value as Trigger["kind"];
                            commitEdit((draft) => {
                              const r = draft.rules.find(
                                (x) => x.id === rule.id
                              );
                              if (!r) return;
                              if (k === "start") r.trigger = { kind: "start" };
                              else if (k === "allCollected")
                                r.trigger = {
                                  kind: "allCollected",
                                  entityType: "coin",
                                };
                              else if (k === "collect")
                                r.trigger = {
                                  kind: "collect",
                                  entityType: "coin",
                                };
                              else if (k === "timer")
                                r.trigger = {
                                  kind: "timer",
                                  seconds: 3,
                                  repeat: true,
                                };
                              else
                                r.trigger = {
                                  kind: "touch",
                                  a: "player",
                                  b: "exit",
                                };
                            });
                          }}
                          className="flex-1 h-7 px-2 rounded bg-bg border border-border text-text"
                        >
                          <option value="start">Game Starts</option>
                          <option value="allCollected">
                            All Coins Collected
                          </option>
                          <option value="collect">Player Collects Coin</option>
                          <option value="touch">Player Touches Exit</option>
                          <option value="timer">Every 3 Seconds (Timer)</option>
                        </select>
                      </div>

                      {/* Condition Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-accent-2 font-bold w-12">
                          IF:
                        </span>
                        <select
                          value={rule.condition.kind}
                          onChange={(e) => {
                            const ck = e.target.value as Condition["kind"];
                            commitEdit((draft) => {
                              const r = draft.rules.find(
                                (x) => x.id === rule.id
                              );
                              if (!r) return;
                              if (ck === "always")
                                r.condition = { kind: "always" };
                              else if (ck === "hasKey")
                                r.condition = {
                                  kind: "hasKey",
                                  lockId: "gold",
                                };
                              else
                                r.condition = {
                                  kind: "varCompare",
                                  name: "score",
                                  op: ">=",
                                  value: 50,
                                };
                            });
                          }}
                          className="flex-1 h-7 px-2 rounded bg-bg border border-border text-text"
                        >
                          <option value="always">Always</option>
                          <option value="hasKey">Player Has &ldquo;gold&rdquo; Key</option>
                          <option value="varCompare">Score &gt;= 50</option>
                        </select>
                      </div>

                      {/* Primary Action Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-warn font-bold w-12">
                          THEN:
                        </span>
                        <select
                          value={
                            rule.actions[rule.actions.length - 1]?.kind || "win"
                          }
                          onChange={(e) => {
                            const ak = e.target.value as Action["kind"];
                            commitEdit((draft) => {
                              const r = draft.rules.find(
                                (x) => x.id === rule.id
                              );
                              if (!r) return;
                              if (ak === "win")
                                r.actions = [
                                  { kind: "playSound", soundId: "win" },
                                  { kind: "win" },
                                ];
                              else if (ak === "lose")
                                r.actions = [{ kind: "lose" }];
                              else if (ak === "openDoor")
                                r.actions = [
                                  { kind: "openDoor", lockId: "gold" },
                                ];
                              else if (ak === "addVar")
                                r.actions = [
                                  {
                                    kind: "addVar",
                                    name: "score",
                                    amount: 10,
                                  },
                                ];
                              else
                                r.actions = [
                                  {
                                    kind: "showText",
                                    text: "Objective triggered!",
                                  },
                                ];
                            });
                          }}
                          className="flex-1 h-7 px-2 rounded bg-bg border border-border text-text"
                        >
                          <option value="win">Win the Game</option>
                          <option value="openDoor">Unlock Doors</option>
                          <option value="addVar">Add +10 to Score</option>
                          <option value="showText">Show Banner Text</option>
                          <option value="lose">Trigger Game Over</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: GAME FEEL & WEB AUDIO SFX SYNTHESIZER */}
            {inspectorTab === "audio" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="font-display uppercase text-text block">
                    Game Feel Presets (Section 1.8)
                  </span>
                  {(
                    [
                      {
                        key: "screenShake",
                        label: "Screen Shake on Hit (2px, 150ms)",
                      },
                      {
                        key: "particles",
                        label: "Particle Burst on Pickup (8px, 300ms)",
                      },
                      { key: "hitFlash", label: "Hit Flash (2 frames white)" },
                    ] as const
                  ).map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-2 rounded bg-surface-2 border border-border cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={doc.feel[item.key]}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          commitEdit((draft) => {
                            draft.feel[item.key] = checked;
                          });
                        }}
                      />
                    </label>
                  ))}
                </div>

                {/* Chiptune Looping Track Picker */}
                <div className="pt-2 border-t border-border">
                  <label className="block font-display uppercase text-text mb-1.5">
                    Chiptune Background Loop
                  </label>
                  <select
                    value={doc.feel.musicTrack}
                    onChange={(e) => {
                      const tr = e.target.value as ForgeGameSchemaV1_1["feel"]["musicTrack"];
                      commitEdit((draft) => {
                        draft.feel.musicTrack = tr;
                      });
                    }}
                    className="w-full h-8 px-2 rounded bg-surface-2 border border-border text-text"
                  >
                    <option value="adventure">Adventure Overworld</option>
                    <option value="dungeon">Crypt Dungeon Arp</option>
                    <option value="cyber">Cyber Arcade Pulse</option>
                    <option value="boss">Boss Arena Drive</option>
                    <option value="none">No Music</option>
                  </select>
                </div>

                {/* Web Audio SFX Synthesizer + Randomize */}
                <div className="pt-2 border-t border-border space-y-2">
                  <span className="font-display uppercase text-text block">
                    Web Audio SFX Synthesizer
                  </span>
                  {Object.values(doc.sounds).map((snd) => (
                    <div
                      key={snd.id}
                      className="p-2.5 rounded bg-surface-2 border border-border flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-text">{snd.name}</p>
                        <p className="text-[10px] font-mono text-text-muted">
                          {snd.wave} • {snd.freq}Hz • {snd.decay}s
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!sfxTesterRef.current) {
                              sfxTesterRef.current = new ForgeAudioEngine();
                            }
                            sfxTesterRef.current.playSound(snd);
                          }}
                          className="px-2 py-1 rounded bg-accent-2 text-bg font-bold text-[11px]"
                        >
                          ▶ Test
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const randomized = randomizeSoundParam(
                              snd.id,
                              snd.name
                            );
                            commitEdit((draft) => {
                              draft.sounds[snd.id] = randomized;
                            });
                            if (!sfxTesterRef.current) {
                              sfxTesterRef.current = new ForgeAudioEngine();
                            }
                            sfxTesterRef.current.playSound(randomized);
                          }}
                          className="px-2 py-1 rounded bg-bg border border-border hover:border-accent text-text text-[11px]"
                        >
                          🎲 Random
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Publish & Reachability Check Modal (uses native <dialog closedby="any">) */}
      <ArcadeDialog
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish & Validation Checks"
      >
        <div className="space-y-4 text-xs">
          {/* Blocking errors */}
          {publishCheck.blockingErrors.length > 0 ? (
            <div className="p-3 rounded-control bg-danger/15 border-2 border-danger text-danger space-y-1">
              <p className="font-bold uppercase">
                ✕ Blocking Errors (Must fix before publishing):
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {publishCheck.blockingErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3 rounded-control bg-accent-2/15 border-2 border-accent-2 text-accent-2 font-semibold">
              ✓ All Schema v1.1.0 & Spawn Checks Passed!
            </div>
          )}

          {/* Non-blocking BFS warnings */}
          {publishCheck.warnings.length > 0 && (
            <div className="p-3 rounded-control bg-warn/15 border-2 border-warn text-warn space-y-1">
              <p className="font-bold uppercase">
                ⚠ BFS Reachability Warnings (Non-blocking):
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {publishCheck.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase text-text-muted mb-1">
              Description (max 500 chars)
            </label>
            <textarea
              rows={2}
              value={doc.description}
              onChange={(e) => {
                const val = e.target.value;
                setDoc((prev) => ({ ...prev, description: val }));
              }}
              className="w-full p-2.5 rounded-control bg-surface-2 border-2 border-border text-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-text-muted mb-1">
                Visibility
              </label>
              <select
                value={publishVisibility}
                onChange={(e) =>
                  setPublishVisibility(
                    e.target.value as "PUBLISHED" | "UNLISTED" | "DRAFT"
                  )
                }
                className="w-full h-9 px-2.5 rounded-control bg-surface-2 border-2 border-border text-text"
              >
                <option value="PUBLISHED">Public Arcade Feed</option>
                <option value="UNLISTED">Unlisted (/g/token Share Link)</option>
                <option value="DRAFT">Save as Draft Version</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-text-muted mb-1">
                Length Bucket
              </label>
              <select
                value={doc.lengthBucket}
                onChange={(e) => {
                  const lb = e.target.value as ForgeGameSchemaV1_1["lengthBucket"];
                  setDoc((prev) => ({ ...prev, lengthBucket: lb }));
                }}
                className="w-full h-9 px-2.5 rounded-control bg-surface-2 border-2 border-border text-text"
              >
                <option value="<2m">Quick Play (&lt;2m)</option>
                <option value="2-5m">Standard (2–5m)</option>
                <option value="5-10m">Adventure (5–10m)</option>
                <option value="10m+">Epic (10m+)</option>
              </select>
            </div>
          </div>

          {/* Submit to Active Jam option (Section 2.6 of Deep Dive) */}
          {jams[0] && jams[0].status === "ACTIVE" && (
            <label className="flex items-center gap-2.5 p-3 rounded-control bg-surface-2 border-2 border-accent-2 cursor-pointer">
              <input
                type="checkbox"
                checked={submitToActiveJam}
                onChange={(e) => setSubmitToActiveJam(e.target.checked)}
              />
              <div>
                <p className="font-bold text-text">
                  Submit Frozen Version to {jams[0].title}
                </p>
                <p className="text-[11px] text-text-muted">
                  Theme: &ldquo;{jams[0].theme}&rdquo; — freezes this version snapshot for fair voting.
                </p>
              </div>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPublishModalOpen(false)}
              className="h-10 px-4 rounded-control border-2 border-border text-xs font-semibold text-text-muted"
            >
              Back to Editor
            </button>
            <button
              type="button"
              onClick={handlePublishConfirm}
              disabled={
                publishVisibility === "PUBLISHED" && !publishCheck.valid
              }
              className="h-10 px-5 rounded-control bg-accent disabled:opacity-40 text-bg font-display uppercase font-bold text-xs border-2 border-black shadow-arcade-sm"
            >
              Confirm & Publish →
            </button>
          </div>
        </div>
      </ArcadeDialog>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center font-display text-sm text-text-muted">
          Loading Forge Studio...
        </div>
      }
    >
      <StudioInner />
    </Suspense>
  );
}
