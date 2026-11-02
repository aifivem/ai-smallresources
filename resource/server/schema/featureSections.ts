import { spec } from "@aifivem/lib/shared";
import type { DataSpec } from "@aifivem/shared";
import { FLEECA_AREAS } from "common/areas";
import {
  LEDGE_DEFAULTS,
  PUSH_BLOCKED_CLASSES,
  UNSTUCK_POINT,
} from "common/features";

const BOOL: DataSpec = { type: "bool" };

/** A list of round areas (label, middle point, radius) like `emergencyAreas`. */
export const areaListSpec = (minRadius: number): DataSpec => ({
  type: "list",
  max: 40,
  of: {
    type: "object",
    fields: {
      label: { type: "text", min: 1, max: 48 },
      point: { type: "vec3" },
      radius: spec.int(minRadius, 1000),
    },
  },
});

const LEDGE_SPEC: DataSpec = {
  type: "object",
  fields: {
    armReach: spec.num(0.3, 3),
    topMin: spec.num(-2, 3),
    topMax: spec.num(-2, 4),
    minSpeed: spec.num(0, 10),
    velocityAssist: spec.num(0, 3),
    upwardAssist: spec.num(0, 5),
    startTimeoutMs: spec.int(0, 5000),
    climbTimeoutMs: spec.int(0, 5000),
    failCooldownMs: spec.int(0, 5000),
    climbCooldownMs: spec.int(0, 5000),
  },
};

/** Data model of the newer feature sections of `data/settings.json` (`common/features.ts`). */
export const FEATURE_SECTIONS: Record<string, DataSpec> = {
  shuffleKey: BOOL,
  vehiclePush: BOOL,
  pushEngineHealth: spec.int(0, 1000),
  pushBlockedClasses: {
    type: "names",
    max: 23,
    itemMax: 2,
    pattern: "^\\d{1,2}$",
  },
  flipVehicle: BOOL,
  flipSeconds: spec.int(3, 120),
  rearRagdoll: BOOL,
  rearRagdollSpeed: spec.num(1, 50),
  noPassengerMass: BOOL,
  noDoubleClutch: BOOL,
  maxDrivingStats: BOOL,
  vehicleCam: BOOL,
  ledgeGrab: BOOL,
  ledge: LEDGE_SPEC,
  unstuck: BOOL,
  unstuckMinutes: spec.int(1, 30),
  unstuckSeconds: spec.int(10, 1800),
  unstuckPoint: { type: "vec4" },
  blockVehicleAreas: areaListSpec(5),
  blockScenarioAreas: areaListSpec(5),
  noPedZones: areaListSpec(5),
  densityZones: BOOL,
  mapBlips: BOOL,
};

export const FEATURE_DEFAULTS = {
  shuffleKey: true,
  vehiclePush: true,
  pushEngineHealth: 1000,
  pushBlockedClasses: PUSH_BLOCKED_CLASSES,
  flipVehicle: true,
  flipSeconds: 15,
  rearRagdoll: true,
  rearRagdollSpeed: 4,
  noPassengerMass: true,
  noDoubleClutch: true,
  maxDrivingStats: true,
  vehicleCam: true,
  ledgeGrab: true,
  ledge: LEDGE_DEFAULTS,
  unstuck: true,
  unstuckMinutes: 2,
  unstuckSeconds: 300,
  unstuckPoint: UNSTUCK_POINT,
  blockVehicleAreas: [],
  blockScenarioAreas: FLEECA_AREAS,
  noPedZones: [],
  densityZones: true,
  mapBlips: true,
};
