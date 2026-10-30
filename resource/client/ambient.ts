import { cache, onCache, TickLoop } from "@aicore-fivem/lib/client";
import { content, onSettings } from "./settings";

/** Ambient population: GTA's density multipliers hold only for the frame they are set in. */
class Density {
  private peds = 1;
  private scenario = 1;
  private traffic = 1;
  private parked = 1;
  private readonly frame = new TickLoop(() => {
    SetPedDensityMultiplierThisFrame(this.peds);
    SetScenarioPedDensityMultiplierThisFrame(this.scenario, this.scenario);
    SetVehicleDensityMultiplierThisFrame(this.traffic);
    SetRandomVehicleDensityMultiplierThisFrame(this.traffic);
    SetParkedVehicleDensityMultiplierThisFrame(this.parked);
  });

  apply(): void {
    const s = content.settings;
    this.peds = s.pedDensity / 100;
    this.scenario = s.scenarioDensity / 100;
    this.traffic = s.trafficDensity / 100;
    this.parked = s.parkedDensity / 100;
    this.frame.set(
      this.peds < 1 || this.scenario < 1 || this.traffic < 1 || this.parked < 1,
    );
  }
}

const density = new Density();
density.apply();
onSettings(() => density.apply());

/** Vehicle radio off: no radio wheel, every vehicle entered has its radio switched off. */
function applyRadio(vehicle: number | false = cache.vehicle): void {
  const off = content.settings.noRadio;
  SetUserRadioControlEnabled(!off);
  if (vehicle === false) return;
  SetVehicleRadioEnabled(vehicle, !off);
  if (off) SetVehRadioStation(vehicle, "OFF");
}
applyRadio();
onSettings(() => applyRadio());
onCache("vehicle", (vehicle) => applyRadio(vehicle));
