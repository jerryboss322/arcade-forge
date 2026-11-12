// Pure TypeScript Deterministic 60Hz Runtime Engine for ArcadeForge
// Zero React dependencies. Shared by Studio, Player, Thumbnailer, and Replay Verifier.

import {
  type ForgeGameSchemaV1_1,
  type EntityInstance,
  type RoomData,
  type Trigger,
  type Condition,
  type Action,
  STUDIO_LIMITS,
} from "./schema";
import { ForgeAudioEngine } from "./audio";

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean; // Space / Z / Gamepad A
}

export interface RuntimeEntity extends EntityInstance {
  px: number; // Subpixel X (0..304)
  py: number; // Subpixel Y (0..224)
  originPx: number;
  originPy: number;
  vx: number;
  vy: number;
  dirX: number;
  dirY: number;
  patrolForward: boolean;
  wanderTimer: number;
  shootTimer: number;
  collected: boolean;
  unlocked: boolean;
}

export interface Projectile {
  px: number;
  py: number;
  vx: number;
  vy: number;
  color: string;
  damage: number;
}

export interface Particle {
  px: number;
  py: number;
  vx: number;
  vy: number;
  color: string;
  ticksLeft: number;
}

export interface QueuedEvent {
  kind: Trigger["kind"];
  a?: string;
  b?: string;
  entityType?: string;
  roomId?: string;
  ruleId?: string;
}

export interface SessionTelemetry {
  durationMs: number;
  result: "playing" | "won" | "lost";
  score: number;
  deathsByCell: Record<string, number>;
}

/**
 * Deterministic seeded PRNG (mulberry32).
 */
export function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ForgeDeterministicRuntime {
  public readonly doc: ForgeGameSchemaV1_1;
  private rng: () => number;
  public tickCount: number = 0;
  public status: "playing" | "won" | "lost" = "playing";
  public currentRoomId: string;
  public roomsState: Map<string, RuntimeEntity[]> = new Map();
  public variables: Record<string, number> = {};
  public heldKeys: Set<string> = new Set();
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];

  // Player state
  public playerHealth: number = 3;
  public maxHealth: number = 3;
  public invulnTicks: number = 0;
  public hitFlashTicks: number = 0;
  public shakeTicks: number = 0;
  public fadeTicks: number = 0; // 9 ticks = 150ms room transition fade

  // Dialogue / HUD text
  public activeText: string | null = null;
  public activeTextTicks: number = 0;
  private prevActionPressed: boolean = false;

  // Rule event queues (Actions produce events for NEXT frame to prevent infinite loops)
  private currentFrameEvents: QueuedEvent[] = [];
  private nextFrameActions: Action[] = [];

  // Analytics & Death Heatmap
  public deathsByCell: Record<string, number> = {};

  // Optional audio engine (null during headless tests)
  public audio: ForgeAudioEngine | null = null;

  constructor(doc: ForgeGameSchemaV1_1, enableAudio = false) {
    this.doc = structuredClone(doc);
    this.rng = createMulberry32(this.doc.seed || 42);

    // Initialize variables
    this.variables = {
      score: 0,
      lives: 3,
      ...structuredClone(this.doc.variables || {}),
    };

    const startRoom = this.doc.rooms.find((r) => r.isStart) || this.doc.rooms[0]!;
    this.currentRoomId = startRoom.id;

    // Hydrate runtime entities per room
    for (const room of this.doc.rooms) {
      const list: RuntimeEntity[] = room.entities.map((e) => ({
        ...structuredClone(e),
        px: e.x * 16,
        py: e.y * 16,
        originPx: e.x * 16,
        originPy: e.y * 16,
        vx: 0,
        vy: 0,
        dirX: e.patrolAxis === "y" ? 0 : 1,
        dirY: e.patrolAxis === "y" ? 1 : 0,
        patrolForward: true,
        wanderTimer: 60,
        shootTimer: Math.max(30, Math.round((e.shootInterval || 2) * 60)),
        collected: false,
        unlocked: false,
      }));
      this.roomsState.set(room.id, list);
    }

    const playerEnt = this.getPlayerEntity();
    if (playerEnt) {
      this.playerHealth = playerEnt.health || 3;
      this.maxHealth = this.playerHealth;
      this.variables.lives = this.playerHealth;
    }

    if (enableAudio && typeof window !== "undefined") {
      this.audio = new ForgeAudioEngine();
    }

    // Queue initial start & enterRoom events
    this.currentFrameEvents.push({ kind: "start" });
    this.currentFrameEvents.push({ kind: "enterRoom", roomId: this.currentRoomId });
  }

  public getCurrentRoom(): RoomData {
    return (
      this.doc.rooms.find((r) => r.id === this.currentRoomId) || this.doc.rooms[0]!
    );
  }

  public getCurrentEntities(): RuntimeEntity[] {
    return this.roomsState.get(this.currentRoomId) || [];
  }

  public getPlayerEntity(): RuntimeEntity | undefined {
    return this.getCurrentEntities().find((e) => e.type === "player" && !e.collected);
  }

  /**
   * Advances simulation by exactly 1 fixed timestep (1/60s).
   * Pure and deterministic given the same InputState sequence.
   */
  public step(input: InputState): void {
    if (this.status !== "playing") return;

    this.tickCount++;
    const dt = 1 / 60;

    if (this.invulnTicks > 0) this.invulnTicks--;
    if (this.hitFlashTicks > 0) this.hitFlashTicks--;
    if (this.shakeTicks > 0) this.shakeTicks--;
    if (this.fadeTicks > 0) this.fadeTicks--;
    if (this.activeTextTicks > 0) {
      this.activeTextTicks--;
      if (this.activeTextTicks === 0) {
        this.activeText = null;
      }
    }

    // Dismiss dialogue on fresh action press
    const actionJustPressed = input.action && !this.prevActionPressed;
    this.prevActionPressed = input.action;
    if (actionJustPressed && this.activeText) {
      this.activeText = null;
      this.activeTextTicks = 0;
    }

    // 1. Execute queued actions from previous frame (with hard cap of 200 actions/frame)
    if (this.nextFrameActions.length > 0) {
      const toRun = this.nextFrameActions.splice(0, STUDIO_LIMITS.maxActionsPerFrame);
      for (const act of toRun) {
        this.executeAction(act);
        if (this.status !== "playing") return;
      }
    }

    // 2. Check timer rules
    for (const rule of this.doc.rules.slice(0, STUDIO_LIMITS.maxRules)) {
      if (rule.trigger.kind === "timer") {
        const intervalTicks = Math.max(1, Math.round(rule.trigger.seconds * 60));
        if (rule.trigger.repeat) {
          if (this.tickCount > 0 && this.tickCount % intervalTicks === 0) {
            this.currentFrameEvents.push({ kind: "timer", ruleId: rule.id });
          }
        } else if (this.tickCount === intervalTicks) {
          this.currentFrameEvents.push({ kind: "timer", ruleId: rule.id });
        }
      }
    }

    const room = this.getCurrentRoom();
    const entities = this.getCurrentEntities();
    const player = this.getPlayerEntity();

    // 3. Move Player
    if (player) {
      const speed = player.speed || 76;
      let dx = 0;
      let dy = 0;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;

      if (dx !== 0 && dy !== 0) {
        const inv = 0.70710678;
        dx *= inv;
        dy *= inv;
      }

      const moveX = dx * speed * dt;
      const moveY = dy * speed * dt;

      this.moveWithTileCollision(room, player, moveX, moveY, true);
    }

    // 4. Update Enemies
    for (const ent of entities) {
      if (ent.collected || ent.type !== "enemy") continue;
      const speed = ent.speed || 44;
      const behavior = ent.behavior || "patrol";

      if (behavior === "patrol") {
        const maxDistPx = (ent.patrolDist || 3) * 16;
        const axis = ent.patrolAxis || "x";
        const dir = ent.patrolForward ? 1 : -1;
        const stepDist = speed * dt * dir;

        if (axis === "x") {
          const hitWall = this.moveWithTileCollision(room, ent, stepDist, 0, false);
          if (hitWall || Math.abs(ent.px - ent.originPx) >= maxDistPx) {
            ent.patrolForward = !ent.patrolForward;
          }
        } else {
          const hitWall = this.moveWithTileCollision(room, ent, 0, stepDist, false);
          if (hitWall || Math.abs(ent.py - ent.originPy) >= maxDistPx) {
            ent.patrolForward = !ent.patrolForward;
          }
        }
      } else if (behavior === "chase" && player) {
        const distPx = Math.hypot(player.px - ent.px, player.py - ent.py);
        const radiusPx = (ent.detectRadius || 5) * 16;
        if (distPx <= radiusPx * 1.5 && distPx > 2) {
          const ux = (player.px - ent.px) / distPx;
          const uy = (player.py - ent.py) / distPx;
          this.moveWithTileCollision(room, ent, ux * speed * dt, uy * speed * dt, false);
        }
      } else if (behavior === "wander") {
        ent.wanderTimer--;
        if (ent.wanderTimer <= 0) {
          ent.wanderTimer = 45 + Math.floor(this.rng() * 60);
          const dirs: Array<[number, number]> = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [0, 0],
          ];
          const pick = dirs[Math.floor(this.rng() * dirs.length)]!;
          ent.dirX = pick[0];
          ent.dirY = pick[1];
        }
        const hit = this.moveWithTileCollision(
          room,
          ent,
          ent.dirX * speed * dt,
          ent.dirY * speed * dt,
          false
        );
        if (hit) {
          ent.dirX = -ent.dirX;
          ent.dirY = -ent.dirY;
        }
      } else if (behavior === "shooter") {
        ent.shootTimer--;
        if (ent.shootTimer <= 0) {
          ent.shootTimer = Math.max(25, Math.round((ent.shootInterval || 2) * 60));
          let vx = 0;
          let vy = 0;
          const projSpeed = 110;
          const sdir = ent.shootDir || "left";
          if (sdir === "up") vy = -projSpeed;
          else if (sdir === "down") vy = projSpeed;
          else if (sdir === "right") vx = projSpeed;
          else if (sdir === "aim" && player) {
            const d = Math.hypot(player.px - ent.px, player.py - ent.py) || 1;
            vx = ((player.px - ent.px) / d) * projSpeed;
            vy = ((player.py - ent.py) / d) * projSpeed;
          } else {
            vx = -projSpeed;
          }
          this.projectiles.push({
            px: ent.px + 6,
            py: ent.py + 6,
            vx,
            vy,
            color: this.doc.palette[8] || "#FF4D8D",
            damage: ent.damage || 1,
          });
        }
      }
    }

    // 5. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.px += p.vx * dt;
      p.py += p.vy * dt;

      // Out of bounds or hit wall
      const tx = Math.floor((p.px + 2) / 16);
      const ty = Math.floor((p.py + 2) / 16);
      if (
        tx < 0 ||
        tx >= room.cols ||
        ty < 0 ||
        ty >= room.rows ||
        (room.walls[ty * room.cols + tx] ?? "") !== ""
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (
        player &&
        this.aabbOverlap(player.px + 2, player.py + 2, 12, 12, p.px, p.py, 4, 4)
      ) {
        this.projectiles.splice(i, 1);
        this.damagePlayer(player, p.damage);
      }
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i]!;
      pt.px += pt.vx * dt;
      pt.py += pt.vy * dt;
      pt.ticksLeft--;
      if (pt.ticksLeft <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 7. Entity Overlaps with Player
    if (player) {
      for (const other of entities) {
        if (other === player || other.collected) continue;

        // NPC interaction (slightly wider radius for talking)
        if (other.type === "npc") {
          const dist = Math.hypot(player.px - other.px, player.py - other.py);
          if (dist < 20 && actionJustPressed && other.dialogue && other.dialogue.length > 0) {
            this.activeText = other.dialogue.join(" ");
            this.activeTextTicks = 240;
            this.audio?.playSound(this.doc.sounds.jump);
          }
        }

        // Standard 12x12 hitbox overlap inside 16x16 tile
        if (
          !this.aabbOverlap(
            player.px + 2,
            player.py + 2,
            12,
            12,
            other.px + 2,
            other.py + 2,
            12,
            12
          )
        ) {
          continue;
        }

        this.currentFrameEvents.push({
          kind: "touch",
          a: "player",
          b: other.type,
        });
        this.currentFrameEvents.push({
          kind: "touch",
          a: "player",
          b: other.id,
        });

        if (other.type === "coin") {
          other.collected = true;
          const val = other.value ?? 10;
          this.variables.score = (this.variables.score || 0) + val;
          this.spawnPickupParticles(other.px + 8, other.py + 8, other.spriteId);
          this.audio?.playSound(this.doc.sounds.coin);
          this.currentFrameEvents.push({ kind: "collect", entityType: "coin" });

          const remainingCoins = entities.filter(
            (e) => e.type === "coin" && !e.collected
          ).length;
          if (remainingCoins === 0) {
            this.currentFrameEvents.push({
              kind: "allCollected",
              entityType: "coin",
            });
          }
        } else if (other.type === "key") {
          other.collected = true;
          const lid = other.lockId || "default";
          this.heldKeys.add(lid);
          this.spawnPickupParticles(other.px + 8, other.py + 8, other.spriteId);
          this.audio?.playSound(this.doc.sounds.coin);
          this.currentFrameEvents.push({ kind: "collect", entityType: "key" });
        } else if (other.type === "door") {
          const lid = other.lockId || "default";
          if (other.unlocked || !other.lockId || this.heldKeys.has(lid)) {
            other.unlocked = true;
            if (other.targetRoom) {
              this.transitionToRoom(
                other.targetRoom,
                other.targetX ?? 1,
                other.targetY ?? 1
              );
              break;
            } else {
              other.collected = true;
              this.audio?.playSound(this.doc.sounds.jump);
            }
          } else if (!this.activeText) {
            this.activeText = `Locked! Requires "${lid}" key.`;
            this.activeTextTicks = 90;
          }
        } else if (other.type === "exit") {
          this.audio?.playSound(this.doc.sounds.win);
          this.status = "won";
          return;
        } else if (other.type === "hazard" || other.type === "enemy") {
          this.damagePlayer(player, other.damage || 1);
        } else if (
          other.type === "npc" &&
          !this.activeText &&
          other.dialogue &&
          other.dialogue.length > 0
        ) {
          this.activeText = other.dialogue.join(" ");
          this.activeTextTicks = 180;
        }
      }
    }

    // 8. Evaluate Rules against currentFrameEvents -> queue actions for NEXT frame
    const eventsToProcess = this.currentFrameEvents.splice(0, this.currentFrameEvents.length);
    for (const ev of eventsToProcess) {
      for (const rule of this.doc.rules.slice(0, STUDIO_LIMITS.maxRules)) {
        if (this.matchesTrigger(rule.trigger, ev, rule.id) && this.matchesCondition(rule.condition)) {
          for (const action of rule.actions.slice(0, STUDIO_LIMITS.maxActionsPerRule)) {
            if (this.nextFrameActions.length < STUDIO_LIMITS.maxActionsPerFrame) {
              this.nextFrameActions.push(action);
            }
          }
        }
      }
    }
  }

  private matchesTrigger(trig: Trigger, ev: QueuedEvent, ruleId: string): boolean {
    if (trig.kind !== ev.kind) return false;
    switch (trig.kind) {
      case "start":
        return true;
      case "touch":
        return (
          (trig.a === ev.a && trig.b === ev.b) ||
          (trig.a === ev.b && trig.b === ev.a)
        );
      case "collect":
      case "allCollected":
        return trig.entityType === ev.entityType;
      case "enterRoom":
        return trig.roomId === ev.roomId;
      case "timer":
        return ev.ruleId === ruleId;
    }
  }

  private matchesCondition(cond: Condition): boolean {
    if (!cond || cond.kind === "always") return true;
    if (cond.kind === "hasKey") {
      return this.heldKeys.has(cond.lockId);
    }
    if (cond.kind === "varCompare") {
      const actual = this.variables[cond.name] ?? 0;
      if (cond.op === ">=") return actual >= cond.value;
      if (cond.op === "<=") return actual <= cond.value;
      if (cond.op === "==") return actual === cond.value;
    }
    return false;
  }

  private executeAction(act: Action): void {
    switch (act.kind) {
      case "addVar": {
        this.variables[act.name] = (this.variables[act.name] ?? 0) + act.amount;
        if (act.name === "lives") {
          this.playerHealth = this.variables.lives ?? 0;
          if (this.playerHealth <= 0) {
            this.status = "lost";
          }
        }
        break;
      }
      case "openDoor": {
        for (const list of this.roomsState.values()) {
          for (const ent of list) {
            if (ent.type === "door" && (ent.lockId === act.lockId || !act.lockId)) {
              ent.unlocked = true;
              if (!ent.targetRoom) {
                ent.collected = true;
              }
            }
          }
        }
        break;
      }
      case "spawn": {
        const list = this.getCurrentEntities();
        if (list.length < STUDIO_LIMITS.maxEntitiesPerRoom) {
          list.push({
            id: `spawn_${this.tickCount}_${list.length}`,
            type: act.entityType,
            spriteId: act.spriteId,
            x: act.x,
            y: act.y,
            px: act.x * 16,
            py: act.y * 16,
            originPx: act.x * 16,
            originPy: act.y * 16,
            vx: 0,
            vy: 0,
            dirX: 1,
            dirY: 0,
            patrolForward: true,
            wanderTimer: 45,
            shootTimer: 90,
            behavior: act.entityType === "enemy" ? "chase" : undefined,
            collected: false,
            unlocked: false,
          });
        }
        break;
      }
      case "playSound": {
        this.audio?.playSound(this.doc.sounds[act.soundId]);
        break;
      }
      case "goToRoom": {
        this.transitionToRoom(act.roomId, act.x, act.y);
        break;
      }
      case "showText": {
        this.activeText = act.text;
        this.activeTextTicks = 180;
        break;
      }
      case "win": {
        this.audio?.playSound(this.doc.sounds.win);
        this.status = "won";
        break;
      }
      case "lose": {
        this.audio?.playSound(this.doc.sounds.lose);
        this.status = "lost";
        break;
      }
    }
  }

  private transitionToRoom(targetRoomId: string, tileX: number, tileY: number) {
    const destRoom = this.doc.rooms.find((r) => r.id === targetRoomId);
    if (!destRoom) return;

    const prevPlayer = this.getPlayerEntity();
    this.currentRoomId = destRoom.id;
    this.fadeTicks = 9; // 150ms fade at 60Hz
    this.projectiles = [];

    const destEntities = this.getCurrentEntities();
    let destPlayer = destEntities.find((e) => e.type === "player");
    if (!destPlayer && prevPlayer) {
      destPlayer = {
        ...structuredClone(prevPlayer),
        x: tileX,
        y: tileY,
        px: tileX * 16,
        py: tileY * 16,
      };
      destEntities.push(destPlayer);
    } else if (destPlayer) {
      destPlayer.px = tileX * 16;
      destPlayer.py = tileY * 16;
    }

    this.currentFrameEvents.push({ kind: "enterRoom", roomId: destRoom.id });
    this.audio?.playSound(this.doc.sounds.jump);
  }

  private damagePlayer(player: RuntimeEntity, amount: number) {
    if (this.invulnTicks > 0 || this.status !== "playing") return;

    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.variables.lives = this.playerHealth;
    this.invulnTicks = 60; // 1 second invulnerability
    if (this.doc.feel.hitFlash) {
      this.hitFlashTicks = 4;
    }
    if (this.doc.feel.screenShake) {
      this.shakeTicks = 9; // 150ms screen shake
    }

    this.audio?.playSound(this.doc.sounds.hit);

    if (this.playerHealth <= 0) {
      const cx = Math.max(0, Math.min(19, Math.floor((player.px + 8) / 16)));
      const cy = Math.max(0, Math.min(14, Math.floor((player.py + 8) / 16)));
      const cellKey = `${this.currentRoomId}:${cx},${cy}`;
      this.deathsByCell[cellKey] = (this.deathsByCell[cellKey] || 0) + 1;
      this.audio?.playSound(this.doc.sounds.lose);
      this.status = "lost";
    }
  }

  private spawnPickupParticles(cx: number, cy: number, spriteId: string) {
    if (!this.doc.feel.particles) return;
    const color = this.getDominantSpriteColor(spriteId);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 38 + this.rng() * 24;
      this.particles.push({
        px: cx,
        py: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        ticksLeft: 18, // 300ms at 60Hz
      });
    }
  }

  private getDominantSpriteColor(spriteId: string): string {
    const sp = this.doc.sprites[spriteId];
    if (!sp || !sp.frames[0]) return this.doc.palette[10] || "#FFEC27";
    const counts: Record<number, number> = {};
    let bestIdx = 10;
    let bestCount = 0;
    for (const p of sp.frames[0]) {
      if (p > 0) {
        counts[p] = (counts[p] || 0) + 1;
        if (counts[p]! > bestCount) {
          bestCount = counts[p]!;
          bestIdx = p;
        }
      }
    }
    return this.doc.palette[bestIdx] || "#FFEC27";
  }

  private moveWithTileCollision(
    room: RoomData,
    ent: RuntimeEntity,
    dx: number,
    dy: number,
    isPlayer: boolean
  ): boolean {
    let hitWall = false;

    // Move X
    const nextPx = Math.max(0, Math.min(304, ent.px + dx));
    if (!this.collidesWithWallsOrLockedDoors(room, nextPx, ent.py, isPlayer)) {
      ent.px = nextPx;
    } else {
      hitWall = true;
    }

    // Move Y
    const nextPy = Math.max(0, Math.min(224, ent.py + dy));
    if (!this.collidesWithWallsOrLockedDoors(room, ent.px, nextPy, isPlayer)) {
      ent.py = nextPy;
    } else {
      hitWall = true;
    }

    return hitWall;
  }

  private collidesWithWallsOrLockedDoors(
    room: RoomData,
    px: number,
    py: number,
    isPlayer: boolean
  ): boolean {
    // Use inset hitbox (12x12 inside 16x16) for smooth corner sliding
    const left = px + 2;
    const right = px + 13;
    const top = py + 2;
    const bottom = py + 13;

    const corners: Array<[number, number]> = [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ];

    for (const [cx, cy] of corners) {
      const tx = Math.floor(cx / 16);
      const ty = Math.floor(cy / 16);
      if (tx < 0 || tx >= room.cols || ty < 0 || ty >= room.rows) return true;
      const wallId = room.walls[ty * room.cols + tx];
      if (wallId && wallId !== "") return true;
    }

    // Check locked doors if non-player, or if player lacks key
    const entities = this.getCurrentEntities();
    for (const other of entities) {
      if (other.collected || other.type !== "door" || other.unlocked) continue;
      if (
        this.aabbOverlap(
          left,
          top,
          12,
          12,
          other.px + 1,
          other.py + 1,
          14,
          14
        )
      ) {
        if (!isPlayer) return true;
        const lid = other.lockId || "default";
        if (other.lockId && !this.heldKeys.has(lid)) {
          return true;
        }
      }
    }

    return false;
  }

  private aabbOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  public getTelemetry(): SessionTelemetry {
    return {
      durationMs: Math.round((this.tickCount / 60) * 1000),
      result: this.status,
      score: this.variables.score || 0,
      deathsByCell: structuredClone(this.deathsByCell),
    };
  }

  /**
   * Renders the current 320x240 frame onto a 2D canvas context.
   */
  public render(ctx: CanvasRenderingContext2D, showDebug = false): void {
    const room = this.getCurrentRoom();
    const palette = this.doc.palette;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Screen shake offset (2px for 150ms)
    if (this.shakeTicks > 0) {
      const ox = (this.tickCount % 2 === 0 ? 1 : -1) * 2;
      const oy = (this.tickCount % 3 === 0 ? 1 : -1) * 2;
      ctx.translate(ox, oy);
    }

    // Background fill (palette index 1 or deep navy)
    ctx.fillStyle = palette[1] || "#0B0C14";
    ctx.fillRect(0, 0, 320, 240);

    // 1. Draw Ground & Wall Layers
    for (let r = 0; r < room.rows; r++) {
      for (let c = 0; c < room.cols; c++) {
        const idx = r * room.cols + c;
        const gId = room.ground[idx];
        if (gId && this.doc.sprites[gId]) {
          this.drawSprite(ctx, this.doc.sprites[gId]!, c * 16, r * 16, false);
        }
        const wId = room.walls[idx];
        if (wId && this.doc.sprites[wId]) {
          this.drawSprite(ctx, this.doc.sprites[wId]!, c * 16, r * 16, false);
        }
      }
    }

    // 2. Draw Entities
    const entities = this.getCurrentEntities();
    for (const ent of entities) {
      if (ent.collected) continue;
      // Invulnerability blink on player
      if (ent.type === "player" && this.invulnTicks > 0 && Math.floor(this.invulnTicks / 3) % 2 === 1) {
        continue;
      }
      const sp = this.doc.sprites[ent.spriteId];
      const flashWhite = ent.type === "player" && this.hitFlashTicks > 0;
      if (sp) {
        this.drawSprite(ctx, sp, Math.round(ent.px), Math.round(ent.py), flashWhite);
      } else {
        ctx.fillStyle = palette[8] || "#FF4D8D";
        ctx.fillRect(Math.round(ent.px), Math.round(ent.py), 16, 16);
      }

      if (showDebug) {
        ctx.strokeStyle = "#37E6C4";
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(ent.px) + 2.5, Math.round(ent.py) + 2.5, 11, 11);
        ctx.fillStyle = "#EDEEFF";
        ctx.font = "8px monospace";
        ctx.fillText(ent.type.slice(0, 4), Math.round(ent.px), Math.round(ent.py) - 2);
      }
    }

    // 3. Draw Projectiles
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.px), Math.round(p.py), 4, 4);
    }

    // 4. Draw Particles
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.px), Math.round(pt.py), 2, 2);
    }

    // 5. Draw Top HUD Overlay
    ctx.fillStyle = "rgba(11, 12, 20, 0.78)";
    ctx.fillRect(0, 0, 320, 16);

    // Hearts
    for (let i = 0; i < this.maxHealth; i++) {
      ctx.fillStyle = i < this.playerHealth ? "#FF4D8D" : "#2B2F5A";
      ctx.fillRect(6 + i * 10, 4, 7, 7);
    }

    // Score & Keys
    ctx.fillStyle = "#EDEEFF";
    ctx.font = "bold 9px monospace";
    ctx.fillText(`SCORE:${this.variables.score ?? 0}`, 48, 11);

    if (this.heldKeys.size > 0) {
      ctx.fillStyle = "#FFC53D";
      ctx.fillText(`KEYS:${Array.from(this.heldKeys).join(",")}`, 130, 11);
    }

    ctx.fillStyle = "#9A9DC8";
    ctx.textAlign = "right";
    ctx.fillText(room.name.slice(0, 16), 314, 11);
    ctx.textAlign = "left";

    // 6. Dialogue Box
    if (this.activeText) {
      ctx.fillStyle = "#14162A";
      ctx.fillRect(12, 188, 296, 42);
      ctx.strokeStyle = "#37E6C4";
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 188, 296, 42);

      ctx.fillStyle = "#EDEEFF";
      ctx.font = "10px monospace";
      const words = this.activeText.split(" ");
      let line1 = "";
      let line2 = "";
      for (const w of words) {
        if ((line1 + " " + w).length <= 42) {
          line1 = (line1 ? line1 + " " : "") + w;
        } else {
          line2 = (line2 ? line2 + " " : "") + w;
        }
      }
      ctx.fillText(line1, 20, 204);
      if (line2) ctx.fillText(line2.slice(0, 44), 20, 218);
    }

    // 7. Room Transition Fade
    if (this.fadeTicks > 0) {
      ctx.fillStyle = `rgba(11, 12, 20, ${(this.fadeTicks / 9).toFixed(2)})`;
      ctx.fillRect(0, 0, 320, 240);
    }

    // 8. Win / Loss End Screen Overlay
    if (this.status !== "playing") {
      ctx.fillStyle = "rgba(11, 12, 20, 0.85)";
      ctx.fillRect(0, 0, 320, 240);

      ctx.fillStyle = this.status === "won" ? "#37E6C4" : "#FF5C5C";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        this.status === "won" ? "VICTORY!" : "GAME OVER",
        160,
        102
      );

      ctx.fillStyle = "#EDEEFF";
      ctx.font = "11px monospace";
      ctx.fillText(
        `Final Score: ${this.variables.score ?? 0}  •  Time: ${(
          this.tickCount / 60
        ).toFixed(1)}s`,
        160,
        128
      );

      ctx.fillStyle = "#FFC53D";
      ctx.font = "10px monospace";
      ctx.fillText("Press R or Restart to Play Again", 160, 154);
      ctx.textAlign = "left";
    }

    ctx.restore();
  }

  private drawSprite(
    ctx: CanvasRenderingContext2D,
    sp: { fps: number; frames: number[][] },
    x: number,
    y: number,
    flashWhite: boolean
  ) {
    if (!sp.frames || sp.frames.length === 0) return;
    const fps = Math.max(1, Math.min(12, sp.fps || 4));
    const ticksPerFrame = Math.max(1, Math.round(60 / fps));
    const frameIdx = Math.floor(this.tickCount / ticksPerFrame) % sp.frames.length;
    const pixels = sp.frames[frameIdx] || sp.frames[0]!;
    const palette = this.doc.palette;

    for (let i = 0; i < 256; i++) {
      const colorIdx = pixels[i] ?? 0;
      if (colorIdx <= 0) continue; // 0 is transparent
      const color = flashWhite ? "#FFFFFF" : palette[colorIdx];
      if (!color || color === "transparent") continue;
      const px = x + (i % 16);
      const py = y + Math.floor(i / 16);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

/**
 * Renders a static 320x240 preview of any room in a game document onto a canvas.
 * Used by both Studio Editor, Thumbnail Generator, and Game Card previews.
 */
export function renderRoomStaticPreview(
  ctx: CanvasRenderingContext2D,
  doc: ForgeGameSchemaV1_1,
  roomId?: string,
  options?: {
    showGrid?: boolean;
    unreachableCoords?: Array<{ roomId: string; x: number; y: number }>;
    heatmapCells?: Record<string, number>;
    selectedEntityId?: string | null;
  }
): void {
  const room =
    doc.rooms.find((r) => r.id === roomId) ||
    doc.rooms.find((r) => r.isStart) ||
    doc.rooms[0];
  if (!room) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = doc.palette[1] || "#0B0C14";
  ctx.fillRect(0, 0, 320, 240);

  const drawPixels = (pixels: number[], ox: number, oy: number) => {
    for (let i = 0; i < 256; i++) {
      const cIdx = pixels[i] ?? 0;
      if (cIdx <= 0) continue;
      const hex = doc.palette[cIdx];
      if (!hex || hex === "transparent") continue;
      ctx.fillStyle = hex;
      ctx.fillRect(ox + (i % 16), oy + Math.floor(i / 16), 1, 1);
    }
  };

  // Ground & Wall tiles
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      const idx: number = r * room.cols + c;
      const gId = room.ground[idx];
      if (gId && doc.sprites[gId]?.frames[0]) {
        drawPixels(doc.sprites[gId]!.frames[0]!, c * 16, r * 16);
      }
      const wId = room.walls[idx];
      if (wId && doc.sprites[wId]?.frames[0]) {
        drawPixels(doc.sprites[wId]!.frames[0]!, c * 16, r * 16);
      }
    }
  }

  // Entities
  for (const ent of room.entities) {
    const sp = doc.sprites[ent.spriteId];
    if (sp?.frames[0]) {
      drawPixels(sp.frames[0], ent.x * 16, ent.y * 16);
    } else {
      ctx.fillStyle = "#FF4D8D";
      ctx.fillRect(ent.x * 16, ent.y * 16, 16, 16);
    }

    if (options?.selectedEntityId === ent.id) {
      ctx.strokeStyle = "#37E6C4";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ent.x * 16 + 0.5, ent.y * 16 + 0.5, 15, 15);
    }
  }

  // Optional grid overlay
  if (options?.showGrid) {
    ctx.strokeStyle = "rgba(237, 238, 255, 0.09)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= 20; c++) {
      ctx.beginPath();
      ctx.moveTo(c * 16 + 0.5, 0);
      ctx.lineTo(c * 16 + 0.5, 240);
      ctx.stroke();
    }
    for (let r = 0; r <= 15; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * 16 + 0.5);
      ctx.lineTo(320, r * 16 + 0.5);
      ctx.stroke();
    }
  }

  // Optional BFS Unreachable item warning boxes
  if (options?.unreachableCoords) {
    for (const u of options.unreachableCoords) {
      if (u.roomId !== room.id) continue;
      ctx.fillStyle = "rgba(255, 92, 92, 0.35)";
      ctx.fillRect(u.x * 16, u.y * 16, 16, 16);
      ctx.strokeStyle = "#FF5C5C";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(u.x * 16 + 1, u.y * 16 + 1, 14, 14);
    }
  }

  // Optional Death Heatmap overlay
  if (options?.heatmapCells) {
    let maxDeaths = 1;
    for (const [k, v] of Object.entries(options.heatmapCells)) {
      if (k.startsWith(`${room.id}:`) && v > maxDeaths) {
        maxDeaths = v;
      }
    }
    for (const [k, count] of Object.entries(options.heatmapCells)) {
      if (!k.startsWith(`${room.id}:`) || count <= 0) continue;
      const coords = k.split(":")[1]?.split(",");
      if (!coords || coords.length < 2) continue;
      const cx = Number(coords[0]);
      const cy = Number(coords[1]);
      const intensity = Math.min(0.85, 0.25 + (count / maxDeaths) * 0.6);
      ctx.fillStyle = `rgba(255, 77, 141, ${intensity.toFixed(2)})`;
      ctx.fillRect(cx * 16, cy * 16, 16, 16);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 8px monospace";
      ctx.fillText(String(count), cx * 16 + 3, cy * 16 + 11);
    }
  }

  ctx.restore();
}

/**
 * Iterative queue-based Flood Fill (Section 1.3 & 1.12: never recursion!).
 */
export function floodFill16x16(
  pixels: number[],
  startX: number,
  startY: number,
  newColor: number
): number[] {
  const result = [...pixels];
  if (startX < 0 || startX >= 16 || startY < 0 || startY >= 16) return result;
  const startIdx = startY * 16 + startX;
  const targetColor = result[startIdx] ?? 0;
  if (targetColor === newColor) return result;

  const queue: Array<[number, number]> = [[startX, startY]];
  const visited = new Set<number>([startIdx]);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const idx = cy * 16 + cx;
    result[idx] = newColor;

    const neighbors: Array<[number, number]> = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= 16 || ny < 0 || ny >= 16) continue;
      const nIdx = ny * 16 + nx;
      if (visited.has(nIdx)) continue;
      if ((result[nIdx] ?? 0) === targetColor) {
        visited.add(nIdx);
        queue.push([nx, ny]);
      }
    }
  }

  return result;
}
