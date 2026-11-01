import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { SEAT_TYPES } from "common/seats";

const OFFSET = { type: "number" as const, min: -10, max: 10 };

export const seatsFile: FileSpec = {
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
};

export const seatsTab: TabSpec = {
  id: "seats",
  file: "seats",
  icon: "chair",
  label: "ADMIN_TAB_SEATS",
  desc: "ADMIN_TAB_SEATS_DESC",
  listSub: "type",
  createLabel: "ADMIN_NEW_SEAT",
  deleteLabel: "ADMIN_DELETE_SEAT",
  cards: [
    {
      icon: "chair",
      title: "ADMIN_C_SEAT",
      desc: "ADMIN_C_SEAT_DESC",
      fields: [
        {
          widget: "model",
          kind: "object",
          path: "model",
          label: "ADMIN_F_SEAT_MODEL",
          hint: "ADMIN_H_SEAT_MODEL",
          placeholder: "ADMIN_P_SEAT_MODEL",
        },
        {
          widget: "select",
          path: "type",
          label: "ADMIN_F_SEAT_TYPE",
          hint: "ADMIN_H_SEAT_TYPE",
          options: Object.keys(SEAT_TYPES).map((value) => ({
            value,
            label: `ADMIN_SEAT_${value.toUpperCase()}`,
          })),
        },
        {
          widget: "switch",
          path: "teleport",
          label: "ADMIN_F_SEAT_TELEPORT",
          hint: "ADMIN_H_SEAT_TELEPORT",
        },
        {
          widget: "list",
          path: "seats",
          label: "ADMIN_F_SEATS",
          hint: "ADMIN_H_SEATS",
          addLabel: "ADMIN_ADD_SEAT",
          max: 12,
          newRow: { x: 0, y: 0, z: 0.5, heading: 180 },
          rows: [
            {
              widget: "number",
              path: "x",
              label: "ADMIN_F_SEAT_X",
              min: -10,
              max: 10,
              step: 0.05,
              unit: "m",
            },
            {
              widget: "number",
              path: "y",
              label: "ADMIN_F_SEAT_Y",
              min: -10,
              max: 10,
              step: 0.05,
              unit: "m",
            },
            {
              widget: "number",
              path: "z",
              label: "ADMIN_F_SEAT_Z",
              min: -10,
              max: 10,
              step: 0.05,
              unit: "m",
            },
            {
              widget: "number",
              path: "heading",
              label: "ADMIN_F_SEAT_HEADING",
              min: 0,
              max: 360,
              step: 5,
              unit: "°",
            },
          ],
        },
      ],
    },
  ],
};
