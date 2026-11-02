import { bool, int, num, record, vec4, type Vec4 } from "@aifivem/lib/shared";
import { type Area, FLEECA_AREAS, readAreaList } from "./areas";

/** Ledge grab numbers (qbx_smallresources `climp`): reach, ledge heights, assists, timeouts and cooldowns. */
export interface LedgeGrab {
  /** Metres between the chest and the wall. */
  armReach: number;
  /** Lowest and highest ledge top, metres from the ped's root. */
  topMin: number;
  topMax: number;
  /** m/s of horizontal speed needed (no grab while falling straight down). */
  minSpeed: number;
  /** Multiplier on the current speed and m/s added upwards when grabbing. */
  velocityAssist: number;
  upwardAssist: number;
  startTimeoutMs: number;
  climbTimeoutMs: number;
  failCooldownMs: number;
  climbCooldownMs: number;
}

export const LEDGE_DEFAULTS: LedgeGrab = {
  armReach: 1.15,
  topMin: -0.35,
  topMax: 2.15,
  minSpeed: 0.45,
  velocityAssist: 1.05,
  upwardAssist: 0.18,
  startTimeoutMs: 420,
  climbTimeoutMs: 1150,
  failCooldownMs: 450,
  climbCooldownMs: 900,
};

/** Where `/unstuck` takes a player (a street in Pillbox Hill, the reference's point). */
export const UNSTUCK_POINT: Vec4 = {
  x: 87.97,
  y: -412.98,
  z: 39.38,
  heading: 0,
};
/** Vehicle classes nobody pushes: cycles, boats, helicopters, planes. */
export const PUSH_BLOCKED_CLASSES = ["13", "14", "15", "16"];

/** Features on the Features tab added after the first set (vehicles, movement, areas, map). */
export interface FeatureSettings {
  shuffleKey: boolean;
  vehiclePush: boolean;
  /** Engine health at or below which a vehicle can be pushed (1000 = any vehicle). */
  pushEngineHealth: number;
  pushBlockedClasses: number[];
  flipVehicle: boolean;
  flipSeconds: number;
  rearRagdoll: boolean;
  /** m/s above which leaving a rear seat knocks the player down. */
  rearRagdollSpeed: number;
  noPassengerMass: boolean;
  noDoubleClutch: boolean;
  maxDrivingStats: boolean;
  vehicleCam: boolean;
  ledgeGrab: boolean;
  ledge: LedgeGrab;
  unstuck: boolean;
  /** Minutes after the character loads during which `/unstuck` works. */
  unstuckMinutes: number;
  unstuckSeconds: number;
  unstuckPoint: Vec4;
  blockVehicleAreas: Area[];
  blockScenarioAreas: Area[];
  noPedZones: Area[];
  densityZones: boolean;
  mapBlips: boolean;
}

function readLedge(raw: unknown): LedgeGrab {
  const v = record(raw);
  const d = LEDGE_DEFAULTS;
  const ms = (value: unknown, fallback: number) =>
    int(value, fallback, 0, 5000);
  return {
    armReach: num(v.armReach, d.armReach, 0.3, 3),
    topMin: num(v.topMin, d.topMin, -2, 3),
    topMax: num(v.topMax, d.topMax, -2, 4),
    minSpeed: num(v.minSpeed, d.minSpeed, 0, 10),
    velocityAssist: num(v.velocityAssist, d.velocityAssist, 0, 3),
    upwardAssist: num(v.upwardAssist, d.upwardAssist, 0, 5),
    startTimeoutMs: ms(v.startTimeoutMs, d.startTimeoutMs),
    climbTimeoutMs: ms(v.climbTimeoutMs, d.climbTimeoutMs),
    failCooldownMs: ms(v.failCooldownMs, d.failCooldownMs),
    climbCooldownMs: ms(v.climbCooldownMs, d.climbCooldownMs),
  };
}

/** A names list of the panel (`tags`): its strings, else the fallback. */
export function names(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.filter((n): n is string => typeof n === "string" && n !== "");
}

export function readFeatureSettings(
  v: Record<string, unknown>,
): FeatureSettings {
  return {
    shuffleKey: bool(v.shuffleKey, true),
    vehiclePush: bool(v.vehiclePush, true),
    pushEngineHealth: int(v.pushEngineHealth, 1000, 0, 1000),
    pushBlockedClasses: names(v.pushBlockedClasses, PUSH_BLOCKED_CLASSES)
      .map(Number)
      .filter((n) => Number.isInteger(n)),
    flipVehicle: bool(v.flipVehicle, true),
    flipSeconds: int(v.flipSeconds, 15, 3, 120),
    rearRagdoll: bool(v.rearRagdoll, true),
    rearRagdollSpeed: num(v.rearRagdollSpeed, 4, 1, 50),
    noPassengerMass: bool(v.noPassengerMass, true),
    noDoubleClutch: bool(v.noDoubleClutch, true),
    maxDrivingStats: bool(v.maxDrivingStats, true),
    vehicleCam: bool(v.vehicleCam, true),
    ledgeGrab: bool(v.ledgeGrab, true),
    ledge: readLedge(v.ledge),
    unstuck: bool(v.unstuck, true),
    unstuckMinutes: int(v.unstuckMinutes, 2, 1, 30),
    unstuckSeconds: int(v.unstuckSeconds, 300, 10, 1800),
    unstuckPoint: vec4(v.unstuckPoint, UNSTUCK_POINT),
    blockVehicleAreas: readAreaList(v.blockVehicleAreas, [], 5),
    blockScenarioAreas: readAreaList(v.blockScenarioAreas, FLEECA_AREAS, 5),
    noPedZones: readAreaList(v.noPedZones, [], 5),
    densityZones: bool(v.densityZones, true),
    mapBlips: bool(v.mapBlips, true),
  };
}
