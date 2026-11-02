import {
  cache,
  every,
  onCache,
  PlayerState,
  stateNumber,
} from "@aifivem/lib/client";
import { content, onWeapons } from "./settings";

/** The player's routing bucket, kept by ai-core's bridge on every bucket change (qb-core's `instance` state). */
const instance = new PlayerState("instance", stateNumber);
const HOOD = 4;
const TRUNK = 5;

/** A point far ahead-right / behind the ped is on screen: the camera looks forward / back. */
function looking(ped: number, x: number, y: number): boolean {
  const [px = 0, py = 0, pz = 0] = GetOffsetFromEntityInWorldCoords(
    ped,
    x,
    y,
    0,
  );
  return World3dToScreen2d(px, py, pz)[0];
}

/** An open, unbroken hood or trunk is in the way. */
const doorOpen = (vehicle: number, door: number) =>
  DoesVehicleHaveDoor(vehicle, door) &&
  GetVehicleDoorAngleRatio(vehicle, door) > 0 &&
  !IsVehicleDoorDamaged(vehicle, door);

/**
 * Drive-by rules, checked every 100 ms in a vehicle: no aiming above the panel's speed in the main world, no aiming
 * from the front seats of armoured models, no shooting back from low sports cars, none through an open hood (forward)
 * or trunk (backward).
 */
class DriveBy {
  private noAim = new Set<number>();
  private noBack = new Set<number>();
  private blocked = false;
  private readonly job = every(100, () => this.check(), {
    active: false,
    name: "driveBy",
  });

  apply(): void {
    const w = content.weapons;
    this.noAim = new Set(w.noAimModels.map((m) => GetHashKey(m)));
    this.noBack = new Set(w.noLookBackModels.map((m) => GetHashKey(m)));
    const on = w.driveBySpeedLimit || w.driveByModels || w.hoodBlocksFire;
    this.job.set(on && cache.vehicle !== false);
    if (!this.job.running) this.set(false);
  }

  private set(blocked: boolean): void {
    if (blocked === this.blocked) return;
    this.blocked = blocked;
    SetPlayerCanDoDriveBy(cache.playerId, !blocked);
  }

  private check(): void {
    const vehicle = cache.vehicle;
    if (vehicle === false) return this.set(false);
    const w = content.weapons;
    const ped = cache.ped;
    const model = GetEntityModel(vehicle);
    let blocked =
      (w.driveByModels &&
        (cache.seat === -1 || cache.seat === 0) &&
        this.noAim.has(model)) ||
      (w.driveBySpeedLimit &&
        (instance.get(cache.serverId) ?? 0) === 0 &&
        GetEntitySpeed(vehicle) > w.driveBySpeed);
    if (!blocked && IsPlayerFreeAiming(cache.playerId)) {
      const back = looking(ped, 0, -40);
      blocked =
        (w.driveByModels && back && this.noBack.has(model)) ||
        (w.hoodBlocksFire &&
          ((doorOpen(vehicle, HOOD) && looking(ped, 22, 80)) ||
            (doorOpen(vehicle, TRUNK) && back)));
    }
    this.set(blocked);
  }
}

const driveBy = new DriveBy();
driveBy.apply();
onWeapons(() => driveBy.apply());
onCache("vehicle", () => driveBy.apply());
