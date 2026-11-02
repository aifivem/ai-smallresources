import {
  every,
  GlobalKey,
  player,
  stateBoolean,
  TickLoop,
  Zones,
} from "@aifivem/lib/client";
import { RecordObjects } from "@aifivem/lib/shared";
import { type DensityZone, readDensityZone } from "common/mapRecords";
import { NPC_DISABLED } from "common/small";
import { content, onSettings, world } from "./settings";

/** The game spawns ambient peds about this far around the player: a no-ped zone holds this much further out. */
const PED_RANGE = 100;
/** Metres around the player cleared while a zone or the NPC switch forces 0. */
const CLEAR_RADIUS = 100;

const npcDisabled = new GlobalKey(NPC_DISABLED, stateBoolean);

/**
 * Ambient population: GTA's density multipliers hold only for the frame they are set in. The Population card's
 * values, overridden inside a density zone (panel polygons), with peds at 0 near a `noPedZones` area, and everything
 * at 0 while an admin switched NPCs off (`SetNpcDisabled`). A forced 0 also clears the area around the player every
 * second.
 */
class Density {
  private peds = 1;
  private scenario = 1;
  private traffic = 1;
  private parked = 1;
  private clearPeds = false;
  private clearTraffic = false;
  /** The density zone the player entered last. */
  private zone: { id: string; zone: DensityZone } | null = null;
  private noPedInside = 0;
  private readonly frame = new TickLoop(() => {
    SetPedDensityMultiplierThisFrame(this.peds);
    SetScenarioPedDensityMultiplierThisFrame(this.scenario, this.scenario);
    SetVehicleDensityMultiplierThisFrame(this.traffic);
    SetRandomVehicleDensityMultiplierThisFrame(this.traffic);
    SetParkedVehicleDensityMultiplierThisFrame(this.parked);
  });
  private readonly clear = every(1000, () => this.clearAround(), {
    active: false,
    name: "densityClear",
  });

  apply(): void {
    const s = content.settings;
    const zone = s.densityZones ? this.zone?.zone : undefined;
    this.parked = s.parkedDensity / 100;
    if (npcDisabled.get() === true) {
      this.set(0, 0, 0, true, true);
      return;
    }
    const traffic = zone?.traffic ?? s.trafficDensity;
    const noPeds = this.noPedInside > 0;
    const peds = noPeds ? 0 : (zone?.peds ?? s.pedDensity);
    const scenario = noPeds ? 0 : (zone?.peds ?? s.scenarioDensity);
    this.set(
      peds / 100,
      scenario / 100,
      traffic / 100,
      zone?.peds === 0,
      zone?.traffic === 0,
    );
  }

  private set(
    peds: number,
    scenario: number,
    traffic: number,
    clearPeds: boolean,
    clearTraffic: boolean,
  ): void {
    this.peds = peds;
    this.scenario = scenario;
    this.traffic = traffic;
    this.clearPeds = clearPeds;
    this.clearTraffic = clearTraffic;
    this.frame.set(peds < 1 || scenario < 1 || traffic < 1 || this.parked < 1);
    this.clear.set(clearPeds || clearTraffic);
  }

  enterZone(id: string, zone: DensityZone): void {
    this.zone = { id, zone };
    this.apply();
  }

  exitZone(id: string): void {
    if (this.zone?.id !== id) return;
    this.zone = null;
    this.apply();
  }

  noPedZone(inside: boolean): void {
    this.noPedInside = Math.max(0, this.noPedInside + (inside ? 1 : -1));
    this.apply();
  }

  private clearAround(): void {
    const { x, y, z } = player.coords();
    const r = CLEAR_RADIUS;
    if (this.clearTraffic)
      RemoveVehiclesFromGeneratorsInArea(
        x - r,
        y - r,
        z - r,
        x + r,
        y + r,
        z + r,
        0,
      );
    if (this.clearPeds) ClearAreaOfPeds(x, y, z, r, true);
  }
}

const density = new Density();

/** Density zones: one lib zone per panel record, rebuilt per edit. */
const zones = new Zones();
const zoneObjects = new RecordObjects(
  world,
  "densityZones",
  readDensityZone,
  (id, zone) => {
    if (!content.settings.densityZones) return;
    zones.add(id, {
      shape: zone.shape,
      onEnter: () => density.enterZone(id, zone),
      onExit: () => density.exitZone(id),
    });
    return () => zones.remove(id);
  },
);

/** No-ped zones: a cylinder of radius + 100 m round each; the peds there are cleared once on entering. */
const noPedZones = new Zones();
let noPedKey = "";
function applyNoPedZones(): void {
  const list = content.settings.noPedZones;
  const key = JSON.stringify(list);
  if (key === noPedKey) return;
  noPedKey = key;
  noPedZones.clear();
  list.forEach((area, i) =>
    noPedZones.add(String(i), {
      shape: {
        type: "cylinder",
        center: area.point,
        radius: area.radius + PED_RANGE,
        height: 500,
      },
      interval: 1000,
      onEnter: () => {
        const { x, y, z } = area.point;
        ClearAreaOfPeds(x, y, z, area.radius, true);
        density.noPedZone(true);
      },
      onExit: () => density.noPedZone(false),
    }),
  );
}

let zonesOn = content.settings.densityZones;
density.apply();
applyNoPedZones();
npcDisabled.onChange(() => density.apply());
onSettings(() => {
  if (zonesOn !== content.settings.densityZones) {
    zonesOn = content.settings.densityZones;
    zoneObjects.rebuildAll();
  }
  applyNoPedZones();
  density.apply();
});
