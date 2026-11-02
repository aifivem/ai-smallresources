import { bool, int, num, record, str } from "@aifivem/lib/shared";
import { names } from "./features";

/**
 * Weapon groups GTA knows (`GetWeapontypeGroup`, unsigned) with the reference's camera kick per shot, in degrees.
 * The label is the panel's lang key.
 */
export const RECOIL_GROUPS = [
  { group: 416676503, pitch: 0.3, label: "ADMIN_O_GROUP_PISTOL" },
  { group: 3337201093, pitch: 0.08, label: "ADMIN_O_GROUP_SMG" },
  { group: 860033945, pitch: 4, label: "ADMIN_O_GROUP_SHOTGUN" },
  { group: 970310034, pitch: 0.1, label: "ADMIN_O_GROUP_RIFLE" },
  { group: 1159398588, pitch: 0.15, label: "ADMIN_O_GROUP_MG" },
  { group: 3082541095, pitch: 8, label: "ADMIN_O_GROUP_SNIPER" },
  { group: 2725924767, pitch: 3, label: "ADMIN_O_GROUP_HEAVY" },
] as const;
const GROUPS: readonly number[] = RECOIL_GROUPS.map((g) => g.group);

/** Vehicles whose driver and front passenger cannot aim (armoured trucks, fire truck). */
export const NO_AIM_MODELS = [
  "bcat",
  "stockade",
  "policet",
  "riot",
  "firetruk",
];
/** Vehicles nobody inside shoots backwards from (low sports cars, fire truck). */
export const NO_LOOK_BACK_MODELS = [
  "zentorno",
  "jester",
  "pagani",
  "infernus",
  "bullet",
  "turismor",
  "thrax",
  "ninef",
  "firetruk",
];
/** Melee weapons whose player damage the panel's percent changes (qbx_smallresources `melee_damage`). */
export const MELEE_WEAPONS =
  "WEAPON_BAT WEAPON_BATTLEAXE WEAPON_BOTTLE WEAPON_CANDYCANE WEAPON_CROWBAR WEAPON_DAGGER WEAPON_FLASHLIGHT WEAPON_GOLFCLUB WEAPON_HAMMER WEAPON_HATCHET WEAPON_KNIFE WEAPON_KNUCKLE WEAPON_MACHETE WEAPON_NIGHTSTICK WEAPON_POOLCUE WEAPON_STONE_HATCHET WEAPON_SWITCHBLADE WEAPON_WRENCH".split(
    " ",
  );

export interface Recoil {
  /** Weapon group (unsigned hash) or weapon name. */
  key: number | string;
  pitch: number;
}

/** The panel file `weapons`: recoil, drive-by rules, firing rules and player melee damage. */
export interface WeaponSettings {
  recoil: boolean;
  recoilGroups: Recoil[];
  recoilWeapons: Recoil[];
  driveBySpeedLimit: boolean;
  /** m/s above which nobody aims from a vehicle in the main world. */
  driveBySpeed: number;
  driveByModels: boolean;
  noAimModels: string[];
  noLookBackModels: string[];
  hoodBlocksFire: boolean;
  noCoverFire: boolean;
  aimToFire: boolean;
  noCombatRoll: boolean;
  antiStrafe: boolean;
  /** A / D presses within one second while aiming that count as a macro. */
  strafeTaps: number;
  strafeBreakMs: number;
  meleeDamage: boolean;
  meleeDamagePercent: number;
  meleeWeapons: string[];
}

export const RECOIL_GROUP_DEFAULTS = RECOIL_GROUPS.map(({ group, pitch }) => ({
  group,
  pitch,
}));

function readRecoil(raw: unknown, field: "group" | "weapon"): Recoil[] | null {
  if (!Array.isArray(raw)) return null;
  const rows: Recoil[] = [];
  for (const row of raw.slice(0, 100)) {
    const v = record(row);
    const pitch = num(v.pitch, 0, 0, 20);
    if (field === "group") {
      const group = num(v.group, 0);
      if (GROUPS.includes(group)) rows.push({ key: group, pitch });
    } else {
      const weapon = str(v.weapon, "", 48);
      if (weapon) rows.push({ key: weapon, pitch });
    }
  }
  return rows;
}

export function readWeapons(raw: unknown): WeaponSettings {
  const v = record(raw);
  return {
    recoil: bool(v.recoil, true),
    recoilGroups:
      readRecoil(v.recoilGroups, "group") ??
      RECOIL_GROUPS.map((g) => ({ key: g.group, pitch: g.pitch })),
    recoilWeapons: readRecoil(v.recoilWeapons, "weapon") ?? [],
    driveBySpeedLimit: bool(v.driveBySpeedLimit, true),
    driveBySpeed: num(v.driveBySpeed, 12, 0, 100),
    driveByModels: bool(v.driveByModels, true),
    noAimModels: names(v.noAimModels, NO_AIM_MODELS),
    noLookBackModels: names(v.noLookBackModels, NO_LOOK_BACK_MODELS),
    hoodBlocksFire: bool(v.hoodBlocksFire, true),
    noCoverFire: bool(v.noCoverFire, true),
    aimToFire: bool(v.aimToFire, true),
    noCombatRoll: bool(v.noCombatRoll, true),
    antiStrafe: bool(v.antiStrafe, true),
    strafeTaps: int(v.strafeTaps, 3, 2, 20),
    strafeBreakMs: int(v.strafeBreakMs, 250, 50, 2000),
    meleeDamage: bool(v.meleeDamage, true),
    meleeDamagePercent: int(v.meleeDamagePercent, 25, 0, 500),
    meleeWeapons: names(v.meleeWeapons, MELEE_WEAPONS),
  };
}
