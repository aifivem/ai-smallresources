import { cache, every, onCache } from "@aicore-fivem/lib/client";
import { content, onSettings } from "./settings";

/** Hood (4) and trunk (5) door indexes. */
const DOORS = [4, 5];
/** Below this body health an open hood or trunk breaks off at any speed. */
const DAMAGED_BODY = 900;

/**
 * An open hood or trunk tears off while driving fast or with a damaged body. Only the driver checks (the driver's
 * client owns the vehicle, so the broken door reaches everyone); the job runs only while the player drives.
 */
class DoorBreak {
  private readonly job = every(100, () => this.check(), {
    active: false,
    name: "breakDoors",
  });

  apply(): void {
    this.job.set(
      content.settings.breakDoors &&
        cache.vehicle !== false &&
        cache.seat === -1,
    );
  }

  private check(): void {
    const vehicle = cache.vehicle;
    if (vehicle === false) return;
    const kmh = GetEntitySpeed(vehicle) * 3.6;
    if (
      kmh <= content.settings.breakDoorsSpeed &&
      GetVehicleBodyHealth(vehicle) >= DAMAGED_BODY
    )
      return;
    for (const door of DOORS)
      if (GetVehicleDoorAngleRatio(vehicle, door) > 0)
        SetVehicleDoorBroken(vehicle, door, false);
  }
}

const doors = new DoorBreak();
doors.apply();
onCache("vehicle", () => doors.apply());
onCache("seat", () => doors.apply());
onSettings(() => doors.apply());
