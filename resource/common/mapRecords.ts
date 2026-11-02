import {
  bool,
  type BlipStyle,
  int,
  num,
  polyFromCorners,
  readBlipStyle,
  record,
  str,
  type Vec3,
  type ZoneShape,
} from "@aifivem/lib/shared";

/** A panel area where the population differs from the Population card (`densityZones` records). */
export interface DensityZone {
  label: string;
  shape: ZoneShape;
  /** Percent of GTA's traffic / pedestrians inside, null = the Population card's value. */
  traffic: number | null;
  peds: number | null;
}

const point = (raw: unknown): Vec3 => {
  const p = record(raw);
  return { x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0) };
};

/** One density zone record; null (left out) under three corners. */
export function readDensityZone(
  _id: string,
  v: Record<string, unknown>,
): DensityZone | null {
  const corners = Array.isArray(v.corners) ? v.corners.map(point) : [];
  const shape = polyFromCorners(corners, num(v.height, 30, 1, 500));
  if (!shape) return null;
  return {
    label: str(v.label, "", 48),
    shape,
    traffic: bool(v.setTraffic, false) ? int(v.traffic, 0, 0, 100) : null,
    peds: bool(v.setPeds, false) ? int(v.peds, 0, 0, 100) : null,
  };
}

/** A map blip of the panel (`blips` records). */
export interface MapBlip {
  label: string;
  point: Vec3;
  style: BlipStyle;
  shortRange: boolean;
}

export const BLIP_DEFAULT: BlipStyle = { sprite: 1, color: 0, scale: 0.7 };

export function readMapBlip(_id: string, v: Record<string, unknown>): MapBlip {
  return {
    label: str(v.label, "", 48),
    point: point(v.point),
    style: readBlipStyle(v.blip, BLIP_DEFAULT),
    shortRange: bool(v.shortRange, true),
  };
}
