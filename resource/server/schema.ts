import { ACCESS_FIELDS, accessFields } from "@aicore-fivem/lib/shared";
import type { PanelSchema } from "@aicore-fivem/shared";
import { SEAT_TYPES } from "common/seats";
import { PLACE_TABS } from "./placeTabs";
import {
  SETTINGS_CARDS,
  SETTINGS_DEFAULTS,
  SETTINGS_SECTIONS,
} from "./settingsCards";

const OFFSET = { type: "number" as const, min: -10, max: 10 };

/** ai-smallresources' panel: feature switches, teleports, elevators, boat moorings and the seats on world objects. */
export const smallSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "sliders",
  files: {
    settings: {
      kind: "settings",
      sync: "all",
      sections: SETTINGS_SECTIONS,
      defaults: SETTINGS_DEFAULTS,
    },
    teleports: {
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
    },
    elevators: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", floors: [] },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        floors: {
          type: "list",
          max: 20,
          of: {
            type: "object",
            fields: {
              label: { type: "text", min: 1, max: 32 },
              point: { type: "vec4" },
              job: { type: "text", lookup: "job", min: 0, max: 32 },
            },
          },
        },
      },
    },
    moorings: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", point: { x: 0, y: 0, z: 0, heading: 0 } },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        point: { type: "vec4" },
      },
    },
    seats: {
      kind: "records",
      sync: "all",
      labelPath: "model",
      newRecord: { model: "", type: "chair", teleport: false, seats: [] },
      sections: {
        model: { type: "text", min: 1, max: 64 },
        type: { type: "enum", values: Object.keys(SEAT_TYPES) },
        teleport: { type: "bool" },
        seats: {
          type: "list",
          min: 1,
          max: 12,
          of: {
            type: "object",
            fields: {
              x: OFFSET,
              y: OFFSET,
              z: OFFSET,
              heading: { type: "number", min: 0, max: 360 },
            },
          },
        },
      },
    },
  },
  tabs: [
    {
      id: "settings",
      file: "settings",
      icon: "sliders",
      label: "ADMIN_TAB_SETTINGS",
      desc: "ADMIN_TAB_SETTINGS_DESC",
      cards: SETTINGS_CARDS,
    },
    {
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
    },
    ...PLACE_TABS,
  ],
};
