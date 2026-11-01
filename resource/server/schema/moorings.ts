import type { FileSpec, TabSpec } from "@aicore-fivem/shared";

export const mooringsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: { label: "", point: { x: 0, y: 0, z: 0, heading: 0 } },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    point: { type: "vec4" },
  },
};

export const mooringsTab: TabSpec = {
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
};
