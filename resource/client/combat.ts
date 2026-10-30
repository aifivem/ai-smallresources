import {
  cache,
  controls,
  every,
  onCache,
  raycast,
} from "@aicore-fivem/lib/client";
import { distance, type Vec3 } from "@aicore-fivem/lib/shared";
import { content, onSettings } from "./settings";

/** Attack and vehicle attack controls blocked while the barrel is behind cover. */
const FIRE_CONTROLS = [24, 69, 92, 106, 257];
const CHECK_MS = 100;

/**
 * Anti ghost-peek: from behind a corner the third person camera sees round it while the gun does not. While aiming,
 * a ray from the weapon to the spot the camera aims at must reach it; when cover is in between, firing is blocked.
 */
class GhostPeek {
  private readonly job = every(CHECK_MS, () => this.check(), {
    active: false,
    name: "ghostPeek",
  });
  private blocked = false;

  watch(armed: boolean): void {
    const on = armed && content.settings.antiPeek;
    if (on === this.job.running) return;
    this.job.set(on);
    if (!on) this.set(false);
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
    const [cx = 0, cy = 0, cz = 0] = GetGameplayCamCoord();
    const [rx = 0, , rz = 0] = GetGameplayCamRot(2);
    const pitch = (rx * Math.PI) / 180;
    const yaw = (rz * Math.PI) / 180;
    const far = 200;
    const cam: Vec3 = { x: cx, y: cy, z: cz };
    const end: Vec3 = {
      x: cx - Math.sin(yaw) * Math.abs(Math.cos(pitch)) * far,
      y: cy + Math.cos(yaw) * Math.abs(Math.cos(pitch)) * far,
      z: cz + Math.sin(pitch) * far,
    };
    // raycast's default flags (map, vehicles, objects) are what stops a bullet.
    const target = raycast(cam, end)?.coords ?? end;
    const [mx = 0, my = 0, mz = 0] = GetEntityCoords(weapon, false);
    const hit = raycast({ x: mx, y: my, z: mz }, target);
    this.set(hit !== null && distance(hit.coords, target) > 1);
  }
}

const peek = new GhostPeek();
peek.watch(cache.weapon !== false);
onCache("weapon", (weapon) => peek.watch(weapon !== false));
onSettings(() => peek.watch(cache.weapon !== false));
