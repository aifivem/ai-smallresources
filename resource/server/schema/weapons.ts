import { spec } from "@aifivem/lib/shared";
import type { DataSpec, FileSpec, TabSpec } from "@aifivem/shared";
import {
  MELEE_WEAPONS,
  NO_AIM_MODELS,
  NO_LOOK_BACK_MODELS,
  RECOIL_GROUP_DEFAULTS,
  RECOIL_GROUPS,
} from "common/weapons";
import { WEAPON_CARDS } from "./weaponCards";

const BOOL: DataSpec = { type: "bool" };
const names = (itemMax: number): DataSpec => ({
  type: "names",
  max: 100,
  itemMax,
  pattern: "^[A-Za-z0-9_]+$",
});

const WEAPON_DEFAULTS = {
  recoil: true,
  recoilGroups: RECOIL_GROUP_DEFAULTS,
  recoilWeapons: [],
  driveBySpeedLimit: true,
  driveBySpeed: 12,
  driveByModels: true,
  noAimModels: NO_AIM_MODELS,
  noLookBackModels: NO_LOOK_BACK_MODELS,
  hoodBlocksFire: true,
  noCoverFire: true,
  aimToFire: true,
  noCombatRoll: true,
  antiStrafe: true,
  strafeTaps: 3,
  strafeBreakMs: 250,
  meleeDamage: true,
  meleeDamagePercent: 25,
  meleeWeapons: MELEE_WEAPONS,
};

/** Data model of `data/weapons.json` (`common/weapons.ts`). */
export const weaponsFile: FileSpec = {
  kind: "settings",
  sync: "all",
  sections: {
    recoil: BOOL,
    recoilGroups: {
      type: "list",
      max: RECOIL_GROUPS.length,
      of: {
        type: "object",
        fields: {
          group: { type: "enum", values: RECOIL_GROUPS.map((g) => g.group) },
          pitch: spec.num(0, 20),
        },
      },
    },
    recoilWeapons: {
      type: "list",
      max: 100,
      of: {
        type: "object",
        fields: {
          weapon: {
            type: "text",
            min: 1,
            max: 48,
            pattern: "^[A-Za-z0-9_]+$",
          },
          pitch: spec.num(0, 20),
        },
      },
    },
    driveBySpeedLimit: BOOL,
    driveBySpeed: spec.num(0, 100),
    driveByModels: BOOL,
    noAimModels: names(32),
    noLookBackModels: names(32),
    hoodBlocksFire: BOOL,
    noCoverFire: BOOL,
    aimToFire: BOOL,
    noCombatRoll: BOOL,
    antiStrafe: BOOL,
    strafeTaps: spec.int(2, 20),
    strafeBreakMs: spec.int(50, 2000),
    meleeDamage: BOOL,
    meleeDamagePercent: spec.int(0, 500),
    meleeWeapons: names(48),
  },
  defaults: WEAPON_DEFAULTS,
};

export const weaponsTab: TabSpec = {
  id: "weapons",
  file: "weapons",
  icon: "gun",
  label: "ADMIN_TAB_WEAPONS",
  desc: "ADMIN_TAB_WEAPONS_DESC",
  cards: WEAPON_CARDS,
};
