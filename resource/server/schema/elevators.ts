import type { FileSpec, TabSpec } from "@aicore-fivem/shared";

export const elevatorsFile: FileSpec = {
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
};

export const elevatorsTab: TabSpec = {
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
};
