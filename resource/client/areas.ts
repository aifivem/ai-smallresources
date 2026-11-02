import { onStop } from "@aifivem/lib/client";
import type { Area } from "common/areas";
import { areaBox, generators, NearAreas } from "./nearAreas";
import { content, onSettings } from "./settings";

/** Vehicle generators load with the map around the player (about 300 m). */
const VEHICLE_RANGE = 400;
/** The game spawns ambient peds about this far around the player. */
const PED_RANGE = 100;

/**
 * Panel areas without GTA's population: `blockVehicleAreas` (no parked or scenario vehicles), `blockScenarioAreas`
 * (no scenario people, e.g. the customer the Fleeca map puts at the counters) and `noPedZones` (no scenario points;
 * the density side lives in `density.ts`). Scenario blocking is set once per settings change; generators and peds
 * come back with the map, so they are cleared again each time the player comes near (`NearAreas`).
 */
class PopulationAreas {
  private blocking: number[] = [];
  private key = "";
  private readonly vehicles = new NearAreas(
    "blockVehicleAreas",
    VEHICLE_RANGE,
    (area) => generators(area, false),
  );
  private readonly scenarios = new NearAreas(
    "blockScenarioAreas",
    PED_RANGE,
    ({ point, radius }) =>
      ClearAreaOfPeds(point.x, point.y, point.z, radius, true),
  );

  apply(): void {
    const s = content.settings;
    const key = JSON.stringify([
      s.blockVehicleAreas,
      s.blockScenarioAreas,
      s.noPedZones,
    ]);
    if (key === this.key) return;
    this.key = key;
    this.clear();
    for (const area of s.blockVehicleAreas) this.block(area, true);
    for (const area of [...s.blockScenarioAreas, ...s.noPedZones])
      this.block(area, false);
    this.vehicles.set(s.blockVehicleAreas);
    this.scenarios.set(s.blockScenarioAreas);
  }

  /** Scenario points in the area's box stop spawning (peds, and vehicles too for a vehicle area). */
  private block(area: Area, vehicles: boolean): void {
    const [ax, ay, az, bx, by, bz] = areaBox(area);
    this.blocking.push(
      AddScenarioBlockingArea(
        ax,
        ay,
        az,
        bx,
        by,
        bz,
        false,
        true,
        true,
        vehicles,
      ),
    );
  }

  clear(): void {
    for (const id of this.blocking) RemoveScenarioBlockingArea(id, false);
    this.blocking = [];
    for (const area of this.vehicles.list) generators(area, true);
  }
}

const areas = new PopulationAreas();
areas.apply();
onSettings(() => areas.apply());
onStop(() => areas.clear());
