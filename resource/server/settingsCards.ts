import type { CardSpec, DataSpec, WidgetSpec } from "@aicore-fivem/shared";

const switchField = (path: string, key: string): WidgetSpec => ({
  widget: "switch",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
});
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

const BOOL: DataSpec = { type: "bool" };
const PERCENT: DataSpec = { type: "number", min: 0, max: 100, integer: true };

/** Data model of `data/settings.json`. */
export const SETTINGS_SECTIONS: Record<string, DataSpec> = {
  seatbelt: BOOL,
  ejectUnbelted: { type: "number", min: 0, max: 500, integer: true },
  ejectBelted: { type: "number", min: 0, max: 500, integer: true },
  cruise: BOOL,
  noShuffle: BOOL,
  noRadio: BOOL,
  fakePlate: BOOL,
  boatRope: BOOL,
  crouch: BOOL,
  tackle: BOOL,
  point: BOOL,
  carry: BOOL,
  sit: BOOL,
  antiPeek: BOOL,
  binoculars: BOOL,
  fireworks: BOOL,
  notepad: BOOL,
  afkMinutes: { type: "number", min: 0, max: 600, integer: true },
  noDispatch: BOOL,
  hideHud: BOOL,
  pedDensity: PERCENT,
  scenarioDensity: PERCENT,
  trafficDensity: PERCENT,
  parkedDensity: PERCENT,
};

/** Values a settings file from an older version is missing. */
export const SETTINGS_DEFAULTS = {
  noRadio: false,
  fakePlate: true,
  boatRope: true,
  point: true,
  carry: true,
  sit: true,
  antiPeek: true,
  notepad: true,
  pedDensity: 80,
  scenarioDensity: 80,
  trafficDensity: 80,
  parkedDensity: 80,
};

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
    ],
  },
  {
    icon: "user",
    title: "ADMIN_C_PLAYER",
    desc: "ADMIN_C_PLAYER_DESC",
    fields: [
      switchField("crouch", "CROUCH"),
      switchField("point", "POINT"),
      switchField("sit", "SIT"),
      switchField("carry", "CARRY"),
      switchField("tackle", "TACKLE"),
      switchField("antiPeek", "ANTI_PEEK"),
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
  {
    icon: "box",
    title: "ADMIN_C_ITEMS",
    desc: "ADMIN_C_ITEMS_DESC",
    fields: [
      switchField("binoculars", "BINOCULARS"),
      switchField("fireworks", "FIREWORKS"),
      switchField("notepad", "NOTEPAD"),
    ],
  },
  {
    icon: "map-location-dot",
    title: "ADMIN_C_WORLD",
    desc: "ADMIN_C_WORLD_DESC",
    fields: [
      switchField("noDispatch", "NO_DISPATCH"),
      switchField("hideHud", "HIDE_HUD"),
    ],
  },
  {
    icon: "people-group",
    title: "ADMIN_C_DENSITY",
    desc: "ADMIN_C_DENSITY_DESC",
    fields: [
      percentField("pedDensity", "PED_DENSITY"),
      percentField("scenarioDensity", "SCENARIO_DENSITY"),
      percentField("trafficDensity", "TRAFFIC_DENSITY"),
      percentField("parkedDensity", "PARKED_DENSITY"),
    ],
  },
];
