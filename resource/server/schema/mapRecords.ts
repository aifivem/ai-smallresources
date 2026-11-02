import { BLIP_STYLE_FIELDS, spec } from "@aifivem/lib/shared";
import type { FileSpec, TabSpec, WidgetSpec } from "@aifivem/shared";
import { BLIP_DEFAULT } from "common/mapRecords";

const percent = (path: string, key: string, set: string): WidgetSpec => ({
  widget: "number",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
  min: 0,
  max: 100,
  step: 5,
  unit: "%",
  showIf: { path: set, values: [true] },
});

/** Data model of `data/densityZones.json`: polygons with their own traffic and pedestrian amounts. */
export const densityZonesFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    corners: [],
    height: 30,
    setTraffic: true,
    traffic: 0,
    setPeds: true,
    peds: 0,
  },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    corners: { type: "list", max: 32, of: { type: "vec3" } },
    height: spec.num(1, 500),
    setTraffic: { type: "bool" },
    traffic: spec.int(0, 100),
    setPeds: { type: "bool" },
    peds: spec.int(0, 100),
  },
};

export const densityZonesTab: TabSpec = {
  id: "densityZones",
  file: "densityZones",
  icon: "draw-polygon",
  label: "ADMIN_TAB_DENSITY_ZONES",
  desc: "ADMIN_TAB_DENSITY_ZONES_DESC",
  createLabel: "ADMIN_NEW_DENSITY_ZONE",
  deleteLabel: "ADMIN_DELETE_DENSITY_ZONE",
  cards: [
    {
      icon: "people-group",
      title: "ADMIN_C_DENSITY_ZONE",
      desc: "ADMIN_C_DENSITY_ZONE_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_DENSITY_ZONE",
        },
        {
          widget: "switch",
          path: "setTraffic",
          label: "ADMIN_F_ZONE_SET_TRAFFIC",
          hint: "ADMIN_H_ZONE_SET_TRAFFIC",
        },
        percent("traffic", "ZONE_TRAFFIC", "setTraffic"),
        {
          widget: "switch",
          path: "setPeds",
          label: "ADMIN_F_ZONE_SET_PEDS",
          hint: "ADMIN_H_ZONE_SET_PEDS",
        },
        percent("peds", "ZONE_PEDS", "setPeds"),
        {
          widget: "number",
          path: "height",
          label: "ADMIN_F_ZONE_HEIGHT",
          hint: "ADMIN_H_ZONE_HEIGHT",
          min: 1,
          max: 500,
          step: 5,
          unit: "m",
        },
      ],
    },
    {
      icon: "location-dot",
      title: "ADMIN_C_ZONE_CORNERS",
      desc: "ADMIN_C_ZONE_CORNERS_DESC",
      fields: [
        {
          widget: "zone",
          path: "corners",
          label: "ADMIN_F_ZONE_CORNERS",
          hint: "ADMIN_H_ZONE_CORNERS",
          heightPath: "height",
          max: 32,
        },
      ],
    },
  ],
};

/** Data model of `data/blips.json`: map blips without a place script. */
export const blipsFile: FileSpec = {
  kind: "records",
  sync: "all",
  labelPath: "label",
  newRecord: {
    label: "",
    point: { x: 0, y: 0, z: 0 },
    blip: BLIP_DEFAULT,
    shortRange: true,
  },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    point: { type: "vec3" },
    blip: { type: "object", fields: BLIP_STYLE_FIELDS },
    shortRange: { type: "bool" },
  },
};

export const blipsTab: TabSpec = {
  id: "blips",
  file: "blips",
  icon: "map",
  label: "ADMIN_TAB_BLIPS",
  desc: "ADMIN_TAB_BLIPS_DESC",
  createLabel: "ADMIN_NEW_BLIP",
  deleteLabel: "ADMIN_DELETE_BLIP",
  cards: [
    {
      icon: "map",
      title: "ADMIN_C_BLIP",
      desc: "ADMIN_C_BLIP_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          suggest: { from: "point" },
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_BLIP",
        },
        { widget: "point", path: "point", label: "ADMIN_F_BLIP_POINT" },
        { widget: "blip", path: "blip", label: "ADMIN_F_BLIP_STYLE" },
        {
          widget: "switch",
          path: "shortRange",
          label: "ADMIN_F_BLIP_SHORT_RANGE",
          hint: "ADMIN_H_BLIP_SHORT_RANGE",
        },
      ],
    },
  ],
};
