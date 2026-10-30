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

export function readTeleports(raw: unknown): Map<string, Teleport> {
  const out = new Map<string, Teleport>();
  const zero = { x: 0, y: 0, z: 0, heading: 0 };
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value);
    out.set(id, {
      id,
      label: str(v.label, id, 48),
      from: vec4(v.from, zero),
      to: vec4(v.to, zero),
      job: str(v.job, "", 32),
    });
  }
  return out;
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

export function readElevators(raw: unknown): Map<string, Elevator> {
  const out = new Map<string, Elevator>();
  const zero = { x: 0, y: 0, z: 0, heading: 0 };
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value);
    const floors = (Array.isArray(v.floors) ? v.floors : []).map((row, i) => {
      const f = record(row);
      return {
        label: str(f.label, String(i + 1), 32),
        point: vec4(f.point, zero),
        job: str(f.job, "", 32),
      };
    });
    if (floors.length >= 2)
      out.set(id, { id, label: str(v.label, id, 48), floors });
  }
  return out;
}

/** A dock spot boats are tied to. */
export interface Mooring {
  id: string;
  point: { x: number; y: number; z: number };
}

/** How near a mooring a boat must float to be tied, in metres. */
export const MOOR_RANGE = 12;

export function readMoorings(raw: unknown): Mooring[] {
  const zero = { x: 0, y: 0, z: 0, heading: 0 };
  return Object.entries(record(raw)).map(([id, value]) => {
    const { x, y, z } = vec4(record(value).point, zero);
    return { id, point: { x, y, z } };
  });
}
