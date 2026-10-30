import { cache, controls, onCache } from "@aicore-fivem/lib/client";
import { content, onSettings } from "./settings";

/** Map, vehicles and objects: what stops a bullet. */
const RAY_FLAGS = 1 | 2 | 16;
/** Attack and vehicle attack controls blocked while the barrel is behind cover. */
const FIRE_CONTROLS = [24, 69, 92, 106, 257];
const CHECK_MS = 50;

function rayHit(from: number[], to: number[], ignore: number): number[] | null {
  const ray = StartExpensiveSynchronousShapeTestLosProbe(
    from[0] ?? 0,
    from[1] ?? 0,
    from[2] ?? 0,
    to[0] ?? 0,
    to[1] ?? 0,
    to[2] ?? 0,
    RAY_FLAGS,
    ignore,
    7,
  );
  const [, hit, coords] = GetShapeTestResult(ray);
  return hit ? coords : null;
}

/**
 * Anti ghost-peek: from behind a corner the third person camera sees round it while the gun does not. While aiming,
 * a ray from the weapon to the spot the camera aims at must reach it; when cover is in between, firing is blocked.
 */
class GhostPeek {
  private timer: ReturnType<typeof setInterval> | null = null;
  private blocked = false;

  watch(armed: boolean): void {
    const on = armed && content.settings.antiPeek;
    if (on && !this.timer)
      this.timer = setInterval(() => this.check(), CHECK_MS);
    else if (!on && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.set(false);
    }
  }

  private set(blocked: boolean): void {
    if (blocked === this.blocked) return;
    this.blocked = blocked;
    if (blocked) controls.disable("ghostpeek", FIRE_CONTROLS);
    else controls.enable("ghostpeek");
  }

  private check(): void {
    const weapon = GetCurrentPedWeaponEntityIndex(cache.ped);
    if (!weapon || !IsPlayerFreeAiming(cache.playerId)) return this.set(false);
    const cam = GetGameplayCamCoord();
    const [rx = 0, , rz = 0] = GetGameplayCamRot(2);
    const pitch = (rx * Math.PI) / 180;
    const yaw = (rz * Math.PI) / 180;
    const far = 200;
    const end = [
      (cam[0] ?? 0) - Math.sin(yaw) * Math.abs(Math.cos(pitch)) * far,
      (cam[1] ?? 0) + Math.cos(yaw) * Math.abs(Math.cos(pitch)) * far,
      (cam[2] ?? 0) + Math.sin(pitch) * far,
    ];
    const target = rayHit(cam, end, cache.ped) ?? end;
    const muzzle = GetEntityCoords(weapon, false);
    const hit = rayHit(muzzle, target, cache.ped);
    this.set(
      hit !== null &&
        Math.hypot(
          (hit[0] ?? 0) - (target[0] ?? 0),
          (hit[1] ?? 0) - (target[1] ?? 0),
          (hit[2] ?? 0) - (target[2] ?? 0),
        ) > 1,
    );
  }
}

const peek = new GhostPeek();
peek.watch(cache.weapon !== false);
onCache("weapon", (weapon) => peek.watch(weapon !== false));
onSettings(() => peek.watch(cache.weapon !== false));
