import type { PanelSchema } from "@aicore-fivem/shared";

/** ai-smallresources' panel: small gameplay switches and teleports between two points. */
export const smallSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "sliders",
  files: {
    settings: {
      kind: "settings",
      sync: "all",
      sections: {
        seatbelt: { type: "bool" },
        ejectUnbelted: { type: "number", min: 0, max: 500, integer: true },
        ejectBelted: { type: "number", min: 0, max: 500, integer: true },
        cruise: { type: "bool" },
        crouch: { type: "bool" },
        noShuffle: { type: "bool" },
        noDispatch: { type: "bool" },
        hideHud: { type: "bool" },
        tackle: { type: "bool" },
        afkMinutes: { type: "number", min: 0, max: 600, integer: true },
        binoculars: { type: "bool" },
        fireworks: { type: "bool" },
      },
    },
    teleports: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", from: { x: 0, y: 0, z: 0, heading: 0 }, to: { x: 0, y: 0, z: 0, heading: 0 }, job: "" },
      sections: { label: { type: "text", min: 1, max: 48 }, from: { type: "vec4" }, to: { type: "vec4" }, job: { type: "text", min: 0, max: 32 } },
    },
  },
  tabs: [
    {
      id: "settings",
      file: "settings",
      icon: "sliders",
      label: "ADMIN_TAB_SETTINGS",
      desc: "ADMIN_TAB_SETTINGS_DESC",
      cards: [
        {
          icon: "car",
          title: "ADMIN_C_DRIVING",
          desc: "ADMIN_C_DRIVING_DESC",
          fields: [
            { widget: "switch", path: "seatbelt", label: "ADMIN_F_SEATBELT", hint: "ADMIN_H_SEATBELT" },
            { widget: "number", path: "ejectUnbelted", label: "ADMIN_F_EJECT_UNBELTED", hint: "ADMIN_H_EJECT", min: 0, max: 500, unit: "km/h" },
            { widget: "number", path: "ejectBelted", label: "ADMIN_F_EJECT_BELTED", min: 0, max: 500, unit: "km/h" },
            { widget: "switch", path: "cruise", label: "ADMIN_F_CRUISE", hint: "ADMIN_H_CRUISE" },
            { widget: "switch", path: "noShuffle", label: "ADMIN_F_NO_SHUFFLE", hint: "ADMIN_H_NO_SHUFFLE" },
          ],
        },
        {
          icon: "user",
          title: "ADMIN_C_PLAYER",
          desc: "ADMIN_C_PLAYER_DESC",
          fields: [
            { widget: "switch", path: "crouch", label: "ADMIN_F_CROUCH", hint: "ADMIN_H_CROUCH" },
            { widget: "switch", path: "tackle", label: "ADMIN_F_TACKLE", hint: "ADMIN_H_TACKLE" },
            { widget: "switch", path: "binoculars", label: "ADMIN_F_BINOCULARS", hint: "ADMIN_H_BINOCULARS" },
            { widget: "switch", path: "fireworks", label: "ADMIN_F_FIREWORKS", hint: "ADMIN_H_FIREWORKS" },
            { widget: "number", path: "afkMinutes", label: "ADMIN_F_AFK", hint: "ADMIN_H_AFK", min: 0, max: 600, unit: "min" },
          ],
        },
        {
          icon: "map-location-dot",
          title: "ADMIN_C_WORLD",
          desc: "ADMIN_C_WORLD_DESC",
          fields: [
            { widget: "switch", path: "noDispatch", label: "ADMIN_F_NO_DISPATCH", hint: "ADMIN_H_NO_DISPATCH" },
            { widget: "switch", path: "hideHud", label: "ADMIN_F_HIDE_HUD", hint: "ADMIN_H_HIDE_HUD" },
          ],
        },
      ],
    },
    {
      id: "teleports",
      file: "teleports",
      icon: "location-dot",
      label: "ADMIN_TAB_TELEPORTS",
      desc: "ADMIN_TAB_TELEPORTS_DESC",
      listSub: "job",
      createLabel: "ADMIN_NEW_TELEPORT",
      deleteLabel: "ADMIN_DELETE_TELEPORT",
      cards: [
        {
          icon: "location-dot",
          title: "ADMIN_C_TELEPORT",
          desc: "ADMIN_C_TELEPORT_DESC",
          fields: [
            { widget: "text", path: "label", label: "ADMIN_F_LABEL", placeholder: "ADMIN_P_LABEL" },
            { widget: "point", path: "from", label: "ADMIN_F_FROM", heading: true, ground: true },
            { widget: "point", path: "to", label: "ADMIN_F_TO", heading: true, ground: true },
            { widget: "text", path: "job", label: "ADMIN_F_JOB", hint: "ADMIN_H_JOB", placeholder: "ADMIN_P_JOB" },
          ],
        },
      ],
    },
  ],
};
