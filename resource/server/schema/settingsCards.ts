import type { CardSpec, WidgetSpec } from "@aicore-fivem/shared";
import { switchField } from "./switchField";
import { COMBAT_CARD, WORLD_CARD } from "./worldCards";

const percentField = (path: string, key: string): WidgetSpec => ({
  widget: "number",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
  min: 0,
  max: 100,
  step: 5,
  unit: "%",
});

/** The cards of the Settings tab. */
export const SETTINGS_CARDS: CardSpec[] = [
  {
    icon: "car",
    title: "ADMIN_C_DRIVING",
    desc: "ADMIN_C_DRIVING_DESC",
    fields: [
      switchField("seatbelt", "SEATBELT"),
      {
        widget: "number",
        path: "ejectUnbelted",
        label: "ADMIN_F_EJECT_UNBELTED",
        hint: "ADMIN_H_EJECT",
        min: 0,
        max: 500,
        unit: "km/h",
      },
      {
        widget: "number",
        path: "ejectBelted",
        label: "ADMIN_F_EJECT_BELTED",
        min: 0,
        max: 500,
        unit: "km/h",
      },
      switchField("cruise", "CRUISE"),
      switchField("noShuffle", "NO_SHUFFLE"),
      switchField("noRadio", "NO_RADIO"),
      switchField("fakePlate", "FAKE_PLATE"),
      switchField("boatRope", "BOAT_ROPE"),
      switchField("noMouseSteer", "NO_MOUSE_STEER"),
      switchField("noAirControl", "NO_AIR_CONTROL"),
    ],
  },
  {
    icon: "user",
    title: "ADMIN_C_PLAYER",
    desc: "ADMIN_C_PLAYER_DESC",
    fields: [
      switchField("crouch", "CROUCH"),
      switchField("noStealth", "NO_STEALTH"),
      switchField("point", "POINT"),
      switchField("handsUp", "HANDS_UP"),
      switchField("ragdoll", "RAGDOLL"),
      switchField("sit", "SIT"),
      switchField("carry", "CARRY"),
      switchField("tackle", "TACKLE"),
      switchField("antiPeek", "ANTI_PEEK"),
      switchField("sprintIndoors", "SPRINT_INDOORS"),
      switchField("noAutoHelmet", "NO_AUTO_HELMET"),
      switchField("keepProps", "KEEP_PROPS"),
      switchField("noIdleCam", "NO_IDLE_CAM"),
      {
        widget: "number",
        path: "afkMinutes",
        label: "ADMIN_F_AFK",
        hint: "ADMIN_H_AFK",
        min: 0,
        max: 600,
        unit: "min",
      },
    ],
  },
  COMBAT_CARD,
  {
    icon: "box",
    title: "ADMIN_C_ITEMS",
    desc: "ADMIN_C_ITEMS_DESC",
    fields: [
      switchField("binoculars", "BINOCULARS"),
      switchField("fireworks", "FIREWORKS"),
      switchField("notepad", "NOTEPAD"),
      switchField("diveGear", "DIVE_GEAR"),
      ...(
        [
          ["diveAir", "DIVE_AIR", 3600],
          ["diveWearSeconds", "DIVE_WEAR", 60],
          ["diveFillSeconds", "DIVE_FILL", 60],
        ] as const
      ).map(([path, key, max]): WidgetSpec => ({
        widget: "number",
        path,
        label: `ADMIN_F_${key}`,
        hint: `ADMIN_H_${key}`,
        min: path === "diveAir" ? 10 : 1,
        max,
        unit: "s",
        showIf: { path: "diveGear", values: [true] },
      })),
    ],
  },
  WORLD_CARD,
  {
    icon: "people-group",
    title: "ADMIN_C_DENSITY",
    desc: "ADMIN_C_DENSITY_DESC",
    fields: [
      percentField("pedDensity", "PED_DENSITY"),
      percentField("scenarioDensity", "SCENARIO_DENSITY"),
      percentField("trafficDensity", "TRAFFIC_DENSITY"),
      percentField("parkedDensity", "PARKED_DENSITY"),
      switchField("noGarbageTrucks", "NO_GARBAGE_TRUCKS"),
    ],
  },
];
