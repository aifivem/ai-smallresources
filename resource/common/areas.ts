import { int, num, record, str } from "@aicore-fivem/lib/shared";

/** A spot where GTA's vehicle generators stay off (police stations, hospitals, bases). */
export interface EmergencyArea {
  label: string;
  point: { x: number; y: number; z: number };
  /** Metres around the point. */
  radius: number;
}

const area = (
  label: string,
  x: number,
  y: number,
  z: number,
  radius: number,
): EmergencyArea => ({ label, point: { x, y, z }, radius });

/** Spots from the community smallresources lists, plus the prison from ai-prison's places. */
export const EMERGENCY_AREAS: EmergencyArea[] = [
  area("Central Los Santos Medical Center", 335.26, -1432.46, 46.51, 100),
  area("Mission Row Police Department", 441.85, -987.99, 30.68, 100),
  area("Pillbox Hill Medical Center", 316.79, -592.36, 43.28, 100),
  area("Fort Zancudo", -2150.44, 3075.99, 32.8, 500),
  area("Altruist camp", -1108.35, 4920.64, 217.2, 150),
  area("Paleto Bay Sheriff", -458.24, 6019.81, 31.34, 100),
  area("Sandy Shores Sheriff", 1854.82, 3679.4, 33.82, 100),
  area("Vespucci helipad", -724.46, -1444.03, 5.0, 100),
  area("Bolingbroke Penitentiary", 1691.0, 2580.0, 45.6, 250),
];

/** The panel's area list; the defaults when it is missing. */
export function readAreas(raw: unknown): EmergencyArea[] {
  if (!Array.isArray(raw)) return EMERGENCY_AREAS;
  return raw.slice(0, 40).map((row, i) => {
    const v = record(row);
    const p = record(v.point);
    return {
      label: str(v.label, String(i + 1), 48),
      point: { x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0) },
      radius: int(v.radius, 100, 10, 1000),
    };
  });
}
