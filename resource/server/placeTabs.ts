import type { TabSpec } from "@aicore-fivem/shared";
import { SEAT_TYPES } from "common/seats";

/** The elevator, mooring and seat tabs. */
export const PLACE_TABS: TabSpec[] = [
  {
    id: "elevators",
    file: "elevators",
    icon: "elevator",
    label: "ADMIN_TAB_ELEVATORS",
    desc: "ADMIN_TAB_ELEVATORS_DESC",
    createLabel: "ADMIN_NEW_ELEVATOR",
    deleteLabel: "ADMIN_DELETE_ELEVATOR",
    cards: [
      {
        icon: "elevator",
        title: "ADMIN_C_ELEVATOR",
        desc: "ADMIN_C_ELEVATOR_DESC",
        fields: [
          {
            widget: "text",
            path: "label",
            label: "ADMIN_F_LABEL",
            placeholder: "ADMIN_P_ELEVATOR",
          },
          {
            widget: "list",
            path: "floors",
            label: "ADMIN_F_FLOORS",
            hint: "ADMIN_H_FLOORS",
            addLabel: "ADMIN_ADD_FLOOR",
            max: 20,
            newRow: {
              label: "",
              point: { x: 0, y: 0, z: 0, heading: 0 },
              job: "",
            },
            rows: [
              {
                widget: "text",
                path: "label",
                label: "ADMIN_F_FLOOR_LABEL",
                placeholder: "ADMIN_P_FLOOR",
              },
              {
                widget: "point",
                path: "point",
                label: "ADMIN_F_FLOOR_POINT",
                heading: true,
                ground: true,
              },
              {
                widget: "text",
                lookup: "job",
                path: "job",
                label: "ADMIN_F_JOB",
                hint: "ADMIN_H_FLOOR_JOB",
                placeholder: "ADMIN_P_JOB",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "moorings",
    file: "moorings",
    icon: "anchor",
    label: "ADMIN_TAB_MOORINGS",
    desc: "ADMIN_TAB_MOORINGS_DESC",
    createLabel: "ADMIN_NEW_MOORING",
    deleteLabel: "ADMIN_DELETE_MOORING",
    cards: [
      {
        icon: "anchor",
        title: "ADMIN_C_MOORING",
        desc: "ADMIN_C_MOORING_DESC",
        fields: [
          {
            widget: "text",
            path: "label",
            suggest: { from: "point" },
            label: "ADMIN_F_LABEL",
            placeholder: "ADMIN_P_MOORING",
          },
          {
            widget: "point",
            path: "point",
            label: "ADMIN_F_MOORING_POINT",
            hint: "ADMIN_H_MOORING_POINT",
          },
        ],
      },
    ],
  },
  {
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
  },
];
