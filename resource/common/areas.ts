import { int, num, record, str } from "@aifivem/lib/shared";

/** A round spot on the map (police stations, hospitals, bank counters). */
export interface Area {
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
): Area => ({ label, point: { x, y, z }, radius });

/** Spots from the community smallresources lists, plus the prison from ai-prison's places. */
export const EMERGENCY_AREAS: Area[] = [
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

/** The Fleeca counters: the bank map's scenario points put a customer in front of them. */
export const FLEECA_AREAS: Area[] = [
  area("Legion Square Fleeca", 149.9, -1040.5, 29.37, 12),
  area("Hawick Fleeca", 314.2, -278.6, 54.17, 12),
  area("Burton Fleeca", -350.8, -49.6, 49.04, 12),
  area("Rockford Hills Fleeca", -1213.0, -330.9, 37.79, 12),
  area("Great Ocean Fleeca", -2962.6, 482.6, 15.7, 12),
  area("Route 68 Fleeca", 1175.0, 2706.6, 38.09, 12),
];

/** A panel area list; `fallback` when it is missing. */
export function readAreaList(
  raw: unknown,
  fallback: Area[],
  minRadius = 10,
): Area[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.slice(0, 40).map((row, i) => {
    const v = record(row);
    const p = record(v.point);
    return {
      label: str(v.label, String(i + 1), 48),
      point: { x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0) },
      radius: int(v.radius, 100, minRadius, 1000),
    };
  });
}
