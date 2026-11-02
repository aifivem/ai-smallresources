import type { CardSpec, WidgetSpec } from "@aifivem/shared";
import { switchField } from "./switchField";

type Show = WidgetSpec["showIf"];

const number = (
  path: string,
  key: string,
  min: number,
  max: number,
  step: number,
  unit: string,
  showIf: Show,
): WidgetSpec => ({
  widget: "number",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
  min,
  max,
  step,
  unit,
  showIf,
});

/** A list of round areas (name, middle point, size), the `emergencyAreas` style. */
const areaList = (path: string, key: string): WidgetSpec => ({
  widget: "list",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
  addLabel: "ADMIN_ADD_EMERGENCY_AREA",
  max: 40,
  min: 0,
  newRow: { label: "", point: { x: 0, y: 0, z: 0 }, radius: 20 },
  rows: [
    {
      widget: "text",
      path: "label",
      label: "ADMIN_F_LABEL",
      placeholder: `ADMIN_P_${key}`,
    },
    { widget: "point", path: "point", label: "ADMIN_F_AREA_POINT" },
    {
      widget: "number",
      path: "radius",
      label: "ADMIN_F_AREA_RADIUS",
      hint: "ADMIN_H_AREA_RADIUS",
      min: 5,
      max: 1000,
      step: 5,
      unit: "m",
    },
  ],
});

const push: Show = { path: "vehiclePush", values: [true] };
const ledge: Show = { path: "ledgeGrab", values: [true] };
const unstuck: Show = { path: "unstuck", values: [true] };

/** Vehicle extras: seat swap key, pushing, flipping and driving tweaks. */
export const VEHICLE_EXTRAS_CARD: CardSpec = {
  icon: "car-side",
  title: "ADMIN_C_VEHICLE_EXTRAS",
  desc: "ADMIN_C_VEHICLE_EXTRAS_DESC",
  fields: [
    switchField("shuffleKey", "SHUFFLE_KEY"),
    switchField("vehiclePush", "VEHICLE_PUSH"),
    number("pushEngineHealth", "PUSH_ENGINE", 0, 1000, 50, "hp", push),
    {
      widget: "tags",
      path: "pushBlockedClasses",
      label: "ADMIN_F_PUSH_CLASSES",
      hint: "ADMIN_H_PUSH_CLASSES",
      placeholder: "ADMIN_P_PUSH_CLASSES",
      showIf: push,
    },
    switchField("flipVehicle", "FLIP_VEHICLE"),
    number("flipSeconds", "FLIP_SECONDS", 3, 120, 1, "s", {
      path: "flipVehicle",
      values: [true],
    }),
    switchField("rearRagdoll", "REAR_RAGDOLL"),
    number("rearRagdollSpeed", "REAR_RAGDOLL_SPEED", 1, 50, 0.5, "m/s", {
      path: "rearRagdoll",
      values: [true],
    }),
    switchField("noPassengerMass", "NO_PASSENGER_MASS"),
    switchField("noDoubleClutch", "NO_DOUBLE_CLUTCH"),
    switchField("maxDrivingStats", "MAX_DRIVING_STATS"),
    switchField("vehicleCam", "VEHICLE_CAM"),
  ],
};

/** Movement: ledge grab and `/unstuck`. */
export const MOVEMENT_CARD: CardSpec = {
  icon: "person-running",
  title: "ADMIN_C_MOVEMENT",
  desc: "ADMIN_C_MOVEMENT_DESC",
  fields: [
    switchField("ledgeGrab", "LEDGE_GRAB"),
    number("ledge.armReach", "LEDGE_REACH", 0.3, 3, 0.05, "m", ledge),
    number("ledge.topMin", "LEDGE_TOP_MIN", -2, 3, 0.05, "m", ledge),
    number("ledge.topMax", "LEDGE_TOP_MAX", -2, 4, 0.05, "m", ledge),
    number("ledge.minSpeed", "LEDGE_MIN_SPEED", 0, 10, 0.05, "m/s", ledge),
    number("ledge.velocityAssist", "LEDGE_VELOCITY", 0, 3, 0.05, "x", ledge),
    number("ledge.upwardAssist", "LEDGE_UPWARD", 0, 5, 0.01, "m/s", ledge),
    number("ledge.startTimeoutMs", "LEDGE_START", 0, 5000, 10, "ms", ledge),
    number("ledge.climbTimeoutMs", "LEDGE_CLIMB", 0, 5000, 10, "ms", ledge),
    number("ledge.failCooldownMs", "LEDGE_FAIL_WAIT", 0, 5000, 10, "ms", ledge),
    number("ledge.climbCooldownMs", "LEDGE_WAIT", 0, 5000, 10, "ms", ledge),
    switchField("unstuck", "UNSTUCK"),
    number("unstuckMinutes", "UNSTUCK_MINUTES", 1, 30, 1, "min", unstuck),
    number("unstuckSeconds", "UNSTUCK_SECONDS", 10, 1800, 10, "s", unstuck),
    {
      widget: "point",
      path: "unstuckPoint",
      label: "ADMIN_F_UNSTUCK_POINT",
      hint: "ADMIN_H_UNSTUCK_POINT",
      heading: true,
      ground: true,
      showIf: unstuck,
    },
  ],
};

/** Areas where GTA spawns no vehicles or people, and the map blips switch. */
export const AREAS_CARD: CardSpec = {
  icon: "draw-polygon",
  title: "ADMIN_C_AREAS",
  desc: "ADMIN_C_AREAS_DESC",
  fields: [
    areaList("blockVehicleAreas", "BLOCK_VEHICLE_AREAS"),
    areaList("blockScenarioAreas", "BLOCK_SCENARIO_AREAS"),
    areaList("noPedZones", "NO_PED_ZONES"),
    switchField("mapBlips", "MAP_BLIPS"),
  ],
};
