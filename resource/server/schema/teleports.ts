import { ACCESS_FIELDS, accessFields } from "@aicore-fivem/lib/shared";
import type { FileSpec, TabSpec } from "@aicore-fivem/shared";

export const teleportsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    from: { x: 0, y: 0, z: 0, heading: 0 },
    to: { x: 0, y: 0, z: 0, heading: 0 },
    jobs: [],
    gangs: [],
  },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    from: { type: "vec4" },
    to: { type: "vec4" },
    ...ACCESS_FIELDS,
  },
};

export const teleportsTab: TabSpec = {
  id: "teleports",
  file: "teleports",
  icon: "location-dot",
  label: "ADMIN_TAB_TELEPORTS",
  desc: "ADMIN_TAB_TELEPORTS_DESC",
  createLabel: "ADMIN_NEW_TELEPORT",
  deleteLabel: "ADMIN_DELETE_TELEPORT",
  cards: [
    {
      icon: "location-dot",
      title: "ADMIN_C_TELEPORT",
      desc: "ADMIN_C_TELEPORT_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          suggest: { from: "from" },
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_LABEL",
        },
        {
          widget: "point",
          path: "from",
          label: "ADMIN_F_FROM",
          heading: true,
          ground: true,
        },
        {
          widget: "point",
          path: "to",
          label: "ADMIN_F_TO",
          heading: true,
          ground: true,
        },
        ...accessFields(),
      ],
    },
  ],
};
