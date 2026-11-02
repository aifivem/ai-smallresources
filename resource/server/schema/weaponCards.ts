import type { CardSpec, WidgetSpec } from "@aifivem/shared";
import { RECOIL_GROUPS } from "common/weapons";
import { switchField } from "./switchField";

const pitch: WidgetSpec = {
  widget: "number",
  path: "pitch",
  label: "ADMIN_F_RECOIL_PITCH",
  hint: "ADMIN_H_RECOIL_PITCH",
  min: 0,
  max: 20,
  step: 0.01,
  unit: "deg",
};

const tags = (path: string, key: string, show: string): WidgetSpec => ({
  widget: "tags",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
  placeholder: `ADMIN_P_${key}`,
  showIf: { path: show, values: [true] },
});

/** The cards of the Weapons tab. */
export const WEAPON_CARDS: CardSpec[] = [
  {
    icon: "gun",
    title: "ADMIN_C_RECOIL",
    desc: "ADMIN_C_RECOIL_DESC",
    fields: [
      switchField("recoil", "RECOIL"),
      {
        widget: "list",
        path: "recoilGroups",
        label: "ADMIN_F_RECOIL_GROUPS",
        hint: "ADMIN_H_RECOIL_GROUPS",
        addLabel: "ADMIN_ADD_RECOIL_GROUP",
        max: RECOIL_GROUPS.length,
        min: 0,
        newRow: { group: RECOIL_GROUPS[0].group, pitch: 0.3 },
        showIf: { path: "recoil", values: [true] },
        rows: [
          {
            widget: "select",
            path: "group",
            label: "ADMIN_F_RECOIL_GROUP",
            options: RECOIL_GROUPS.map((g) => ({
              value: g.group,
              label: g.label,
            })),
          },
          pitch,
        ],
      },
      {
        widget: "list",
        path: "recoilWeapons",
        label: "ADMIN_F_RECOIL_WEAPONS",
        hint: "ADMIN_H_RECOIL_WEAPONS",
        addLabel: "ADMIN_ADD_RECOIL_WEAPON",
        max: 100,
        min: 0,
        search: true,
        newRow: { weapon: "", pitch: 0.3 },
        showIf: { path: "recoil", values: [true] },
        rows: [
          {
            widget: "text",
            path: "weapon",
            label: "ADMIN_F_RECOIL_WEAPON",
            placeholder: "ADMIN_P_RECOIL_WEAPON",
          },
          pitch,
        ],
      },
    ],
  },
  {
    icon: "car",
    title: "ADMIN_C_DRIVE_BY",
    desc: "ADMIN_C_DRIVE_BY_DESC",
    fields: [
      switchField("driveBySpeedLimit", "DRIVE_BY_SPEED_LIMIT"),
      {
        widget: "number",
        path: "driveBySpeed",
        label: "ADMIN_F_DRIVE_BY_SPEED",
        hint: "ADMIN_H_DRIVE_BY_SPEED",
        min: 0,
        max: 100,
        step: 1,
        unit: "m/s",
        showIf: { path: "driveBySpeedLimit", values: [true] },
      },
      switchField("driveByModels", "DRIVE_BY_MODELS"),
      tags("noAimModels", "NO_AIM_MODELS", "driveByModels"),
      tags("noLookBackModels", "NO_LOOK_BACK_MODELS", "driveByModels"),
      switchField("hoodBlocksFire", "HOOD_BLOCKS_FIRE"),
    ],
  },
  {
    icon: "hand-pointer",
    title: "ADMIN_C_FIRING",
    desc: "ADMIN_C_FIRING_DESC",
    fields: [
      switchField("noCoverFire", "NO_COVER_FIRE"),
      switchField("aimToFire", "AIM_TO_FIRE"),
      switchField("noCombatRoll", "NO_COMBAT_ROLL"),
      switchField("antiStrafe", "ANTI_STRAFE"),
      {
        widget: "number",
        path: "strafeTaps",
        label: "ADMIN_F_STRAFE_TAPS",
        hint: "ADMIN_H_STRAFE_TAPS",
        min: 2,
        max: 20,
        step: 1,
        unit: "/s",
        showIf: { path: "antiStrafe", values: [true] },
      },
      {
        widget: "number",
        path: "strafeBreakMs",
        label: "ADMIN_F_STRAFE_BREAK",
        hint: "ADMIN_H_STRAFE_BREAK",
        min: 50,
        max: 2000,
        step: 50,
        unit: "ms",
        showIf: { path: "antiStrafe", values: [true] },
      },
    ],
  },
  {
    icon: "hammer",
    title: "ADMIN_C_MELEE",
    desc: "ADMIN_C_MELEE_DESC",
    fields: [
      switchField("meleeDamage", "MELEE_DAMAGE"),
      {
        widget: "number",
        path: "meleeDamagePercent",
        label: "ADMIN_F_MELEE_DAMAGE_PERCENT",
        hint: "ADMIN_H_MELEE_DAMAGE_PERCENT",
        min: 0,
        max: 500,
        step: 5,
        unit: "%",
        showIf: { path: "meleeDamage", values: [true] },
      },
      tags("meleeWeapons", "MELEE_WEAPONS", "meleeDamage"),
    ],
  },
];
