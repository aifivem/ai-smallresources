import type { CardSpec, DataSpec } from "@aicore-fivem/shared";
import { switchField } from "./fields";

/** Panel areas where GTA's vehicle generators stay off. */
export const EMERGENCY_AREAS_SPEC: DataSpec = {
  type: "list",
  max: 40,
  of: {
    type: "object",
    fields: {
      label: { type: "text", min: 1, max: 48 },
      point: { type: "vec3" },
      radius: { type: "number", min: 10, max: 1000, integer: true },
    },
  },
};

/** The Combat card of the Settings tab. */
export const COMBAT_CARD: CardSpec = {
  icon: "gun",
  title: "ADMIN_C_COMBAT",
  desc: "ADMIN_C_COMBAT_DESC",
  fields: [
    switchField("noActionMode", "NO_ACTION_MODE"),
    switchField("noPistolWhip", "NO_PISTOL_WHIP"),
    switchField("noCoverPeek", "NO_COVER_PEEK"),
    switchField("noCriticalHits", "NO_CRITICAL_HITS"),
    switchField("noBunnyHop", "NO_BUNNY_HOP"),
    switchField("noPickups", "NO_PICKUPS"),
    switchField("noVehicleRewards", "NO_VEHICLE_REWARDS"),
  ],
};

/** The World card of the Settings tab. */
export const WORLD_CARD: CardSpec = {
  icon: "map-location-dot",
  title: "ADMIN_C_WORLD",
  desc: "ADMIN_C_WORLD_DESC",
  fields: [
    switchField("noDispatch", "NO_DISPATCH"),
    switchField("noEmergencySpawns", "NO_EMERGENCY_SPAWNS"),
    {
      widget: "list",
      path: "emergencyAreas",
      label: "ADMIN_F_EMERGENCY_AREAS",
      hint: "ADMIN_H_EMERGENCY_AREAS",
      addLabel: "ADMIN_ADD_EMERGENCY_AREA",
      max: 40,
      newRow: { label: "", point: { x: 0, y: 0, z: 0 }, radius: 100 },
      showIf: { path: "noEmergencySpawns", values: [true] },
      rows: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_EMERGENCY_AREA",
        },
        {
          widget: "point",
          path: "point",
          label: "ADMIN_F_AREA_POINT",
        },
        {
          widget: "number",
          path: "radius",
          label: "ADMIN_F_AREA_RADIUS",
          hint: "ADMIN_H_AREA_RADIUS",
          min: 10,
          max: 1000,
          step: 10,
          unit: "m",
        },
      ],
    },
    switchField("noAircraft", "NO_AIRCRAFT"),
    switchField("noPoliceAudio", "NO_POLICE_AUDIO"),
    switchField("quietAmbience", "QUIET_AMBIENCE"),
    switchField("hideHud", "HIDE_HUD"),
  ],
};
