import { every, player } from "@aifivem/lib/client";
import { distance } from "@aifivem/lib/shared";
import type { Area } from "common/areas";

/**
 * Panel areas whose world state streams back in with the map (vehicle generators, ambient peds): `onApproach` runs
 * each time the player comes within radius + `range` metres of one, checked every 5 s only while there are areas.
 */
export class NearAreas {
  private areas: Area[] = [];
  private readonly near = new Set<Area>();
  private readonly job;

  constructor(
    name: string,
    private readonly range: number,
    private readonly onApproach: (area: Area) => void,
  ) {
    this.job = every(5000, () => this.check(), { active: false, name });
  }

  get list(): readonly Area[] {
    return this.areas;
  }

  set(areas: Area[]): void {
    this.areas = areas;
    this.near.clear();
    this.job.set(areas.length > 0);
    if (areas.length > 0) this.check();
  }

  private check(): void {
    const at = player.coords();
    for (const area of this.areas) {
      const close = distance(at, area.point) < area.radius + this.range;
      if (close === this.near.has(area)) continue;
      if (!close) {
        this.near.delete(area);
        continue;
      }
      this.near.add(area);
      this.onApproach(area);
    }
  }
}

/** The area's box corners: [minX, minY, minZ, maxX, maxY, maxZ]. */
export function areaBox(
  area: Area,
): [number, number, number, number, number, number] {
  const { x, y, z } = area.point;
  const r = area.radius;
  return [x - r, y - r, z - r, x + r, y + r, z + r];
}

/** GTA's vehicle generators in the area's box on or off; off also removes the vehicles they parked. */
export function generators(area: Area, active: boolean): void {
  const [ax, ay, az, bx, by, bz] = areaBox(area);
  SetAllVehicleGeneratorsActiveInArea(ax, ay, az, bx, by, bz, active, false);
  if (!active) RemoveVehiclesFromGeneratorsInArea(ax, ay, az, bx, by, bz, 0);
}
