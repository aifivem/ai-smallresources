import { cache, every, onCache, TickLoop } from "@aifivem/lib/client";
import { content, onSettings } from "./settings";

/** Leaving a rear seat of a moving vehicle (not GTA's jump out) keeps its speed and knocks the player down. */
onCache("seat", (seat, old) => {
  const s = content.settings;
  if (!s.rearRagdoll || seat !== false || old === false || old < 1) return;
  const ped = cache.ped;
  const vehicle = GetVehiclePedIsIn(ped, true);
  if (
    !vehicle ||
    IsPedJumpingOutOfVehicle(ped) ||
    GetEntitySpeed(vehicle) < s.rearRagdollSpeed
  )
    return;
  const [x = 0, y = 0, z = 0] = GetEntityVelocity(vehicle);
  SetEntityVelocity(ped, x, y, z);
  setTimeout(() => SetPedToRagdoll(ped, 5000, 5000, 0, false, false, false), 0);
});

/** Passengers add no weight to the vehicle (its handling stays the same however many sit in). */
function applyMass(): void {
  SetGlobalPassengerMassMultiplier(content.settings.noPassengerMass ? 0 : 1);
}

/** Driving and wheelie skill at full, so every character handles vehicles the same. */
function applyStats(): void {
  if (!content.settings.maxDrivingStats) return;
  StatSetInt("MP0_WHEELIE_ABILITY", 100, true);
  StatSetInt("MP0_DRIVING_ABILITY", 100, true);
}

/** mph: GTA's double-clutch bug (low gear at full rpm) only shows at speed. */
const CLUTCH_MPH = 50;

/**
 * Anti double clutch: a vehicle stuck in first or second gear at the rev limiter at speed (shifting abuse) gets its
 * rpm pulled down until it shifts. Checked every 500 ms while driving.
 */
class Clutch {
  private vehicle = 0;
  private pauseUntil = 0;
  private readonly job = every(500, () => this.check(), {
    active: false,
    name: "doubleClutch",
  });
  private readonly fix = new TickLoop(() => {
    const vehicle = this.vehicle;
    if (!DoesEntityExist(vehicle) || GetVehicleCurrentRpm(vehicle) <= 0.6) {
      this.fix.set(false);
      this.pauseUntil = GetGameTimer() + 800;
      return;
    }
    SetVehicleCurrentRpm(vehicle, 0.3);
  });

  apply(): void {
    this.job.set(
      content.settings.noDoubleClutch &&
        cache.vehicle !== false &&
        cache.seat === -1,
    );
  }

  private check(): void {
    const vehicle = cache.vehicle;
    if (vehicle === false || this.fix.running) return;
    if (GetGameTimer() < this.pauseUntil) return;
    if (
      GetVehicleCurrentGear(vehicle) < 3 &&
      GetVehicleCurrentRpm(vehicle) === 1 &&
      Math.ceil(GetEntitySpeed(vehicle) * 2.236936) > CLUTCH_MPH &&
      GetVehicleHandlingInt(vehicle, "CHandlingData", "nInitialDriveGears") > 3
    ) {
      this.vehicle = vehicle;
      this.fix.set(true);
    }
  }
}

const clutch = new Clutch();
function apply(): void {
  applyMass();
  applyStats();
  clutch.apply();
}
apply();
onSettings(apply);
onCache("vehicle", (vehicle) => {
  if (vehicle !== false) applyMass();
  clutch.apply();
});
onCache("seat", () => clutch.apply());
