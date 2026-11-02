import { cache, onCache } from "@aifivem/lib/client";
import { content, onSettings } from "./settings";

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
