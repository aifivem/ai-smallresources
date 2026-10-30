import { record, str, vec4, type Vec4 } from "@aicore-fivem/lib/shared";

/** Panel records with places: teleports, elevators and moorings (no natives). */

export interface Teleport {
  id: string;
  label: string;
  from: Vec4;
  to: Vec4;
  /** Empty: everyone; otherwise members of this job. */
  job: string;
}

const ZERO = { x: 0, y: 0, z: 0, heading: 0 };

/** One teleport record (`panel.records` / `world.records`). */
export function readTeleport(id: string, v: Record<string, unknown>): Teleport {
  return {
    id,
    label: str(v.label, id, 48),
    from: vec4(v.from, ZERO),
    to: vec4(v.to, ZERO),
    job: str(v.job, "", 32),
  };
}

export interface Floor {
  label: string;
  point: Vec4;
  /** Empty: everyone; otherwise members of this job reach this floor. */
  job: string;
}

export interface Elevator {
  id: string;
  label: string;
  floors: Floor[];
}

/** One elevator record; null (left out) with fewer than two floors. */
export function readElevator(
  id: string,
  v: Record<string, unknown>,
): Elevator | null {
  const floors = (Array.isArray(v.floors) ? v.floors : []).map((row, i) => {
    const f = record(row);
    return {
      label: str(f.label, String(i + 1), 32),
      point: vec4(f.point, ZERO),
      job: str(f.job, "", 32),
    };
  });
  return floors.length >= 2
    ? { id, label: str(v.label, id, 48), floors }
    : null;
}

/** A dock spot boats are tied to. */
export interface Mooring {
  id: string;
  point: { x: number; y: number; z: number };
}

/** How near a mooring a boat must float to be tied, in metres. */
export const MOOR_RANGE = 12;

/** One mooring record. */
export function readMooring(id: string, v: Record<string, unknown>): Mooring {
  const { x, y, z } = vec4(v.point, ZERO);
  return { id, point: { x, y, z } };
}
