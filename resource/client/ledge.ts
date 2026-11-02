import {
  cache,
  every,
  medical,
  raycast,
  Reasons,
  registerExport,
  TickLoop,
} from "@aifivem/lib/client";
import { waitFor } from "@aifivem/lib/shared";
import { cuffed } from "./gestures/guards";
import { content, onSettings } from "./settings";

/** Map and objects. */
const WORLD = 1 | 16;
/** The ray must clear this much room above the ledge top for the ped. */
const HEADROOM = 1.6;

const airborne = (ped: number) =>
  IsPedJumping(ped) || IsPedFalling(ped) || IsEntityInAir(ped);

/** Never in a vehicle, down, cuffed, ragdolled, swimming, climbing, parachuting or in noclip (see-through / hidden). */
function blocked(ped: number): boolean {
  return (
    cache.vehicle !== false ||
    medical.isDead() ||
    cuffed.get(cache.serverId) === true ||
    IsPedRagdoll(ped) ||
    IsPedSwimming(ped) ||
    IsPedClimbing(ped) ||
    IsPedVaulting(ped) ||
    IsPedInParachuteFreeFall(ped) ||
    GetPedParachuteState(ped) > 0 ||
    GetEntityAlpha(ped) < 255 ||
    !IsEntityVisible(ped)
  );
}

/**
 * Ledge grab (qbx_smallresources `climp`): while the player is in the air a wall within reach with a free ledge top
 * starts GTA's own climb (`TaskClimb`); no teleport. A 250 ms check switches the per-frame probe on only while
 * airborne. Other scripts switch it off for a while with the export `SetLedgeGrabEnabled(false)`.
 */
class LedgeGrab {
  readonly off = new Reasons();
  private nextAt = 0;
  private grabbing = false;
  private readonly watch = every(250, () => this.check(), {
    active: false,
    name: "ledgeGrab",
  });
  private readonly frame = new TickLoop(() => this.tick());

  apply(): void {
    this.watch.set(content.settings.ledgeGrab && !this.off.any);
    if (!this.watch.running) this.frame.set(false);
  }

  private check(): void {
    const ped = cache.ped;
    this.frame.set(!blocked(ped) && airborne(ped));
  }

  private tick(): void {
    const ped = cache.ped;
    if (this.grabbing) return;
    if (!airborne(ped) || blocked(ped)) return this.frame.set(false);
    if (GetGameTimer() < this.nextAt || !this.ledge(ped)) return;
    void this.grab(ped);
  }

  /** A wall within arm's reach ahead with a ledge top between the panel's heights and room above it. */
  private ledge(ped: number): boolean {
    const l = content.settings.ledge;
    const [vx = 0, vy = 0] = GetEntityVelocity(ped);
    if (Math.hypot(vx, vy) < l.minSpeed) return false;
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(ped, false);
    const [fx = 0, fy = 0] = GetEntityForwardVector(ped);
    const chest = { x: px, y: py, z: pz + 0.5 };
    const wall = raycast(
      chest,
      { x: px + fx * l.armReach, y: py + fy * l.armReach, z: chest.z },
      { flags: WORLD },
    );
    if (!wall) return false;
    const x = wall.coords.x + fx * 0.3;
    const y = wall.coords.y + fy * 0.3;
    const top = raycast(
      { x, y, z: pz + l.topMax },
      { x, y, z: pz + l.topMin },
      { flags: WORLD },
    );
    if (!top) return false;
    const { z } = top.coords;
    return !raycast(
      { x, y, z: z + 0.2 },
      { x, y, z: z + HEADROOM },
      { flags: WORLD },
    );
  }

  /** Starts the climb; when GTA does not take it the player falls on as before. */
  private async grab(ped: number): Promise<void> {
    const l = content.settings.ledge;
    this.grabbing = true;
    const [vx = 0, vy = 0, vz = 0] = GetEntityVelocity(ped);
    SetEntityVelocity(
      ped,
      vx * l.velocityAssist,
      vy * l.velocityAssist,
      vz + l.upwardAssist,
    );
    TaskClimb(ped, true);
    const climbing = () => IsPedClimbing(ped) || IsPedVaulting(ped);
    const started = await waitFor(
      () => (climbing() ? true : undefined),
      l.startTimeoutMs,
    ).catch(() => false);
    if (started)
      await waitFor(
        () => (climbing() ? undefined : true),
        l.climbTimeoutMs,
      ).catch(() => null);
    this.nextAt =
      GetGameTimer() + (started ? l.climbCooldownMs : l.failCooldownMs);
    this.grabbing = false;
  }
}

const ledge = new LedgeGrab();
ledge.apply();
onSettings(() => ledge.apply());
ledge.off.onChange(() => ledge.apply());
registerExport("SetLedgeGrabEnabled", (enabled: unknown) => {
  ledge.off.set("export", enabled === false);
});
