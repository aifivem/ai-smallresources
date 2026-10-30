import {
  cache,
  Keybind,
  notify,
  onCache,
  TickLoop,
} from "@aicore-fivem/lib/client";
import { Locale, ResourceName } from "common";
import { content, onSettings } from "./settings";

/** Vehicle classes without a seatbelt: motorcycles, cycles, boats, helicopters, planes, trains. */
const NO_BELT = new Set([8, 13, 14, 15, 16, 21]);

/**
 * Seatbelt (GTA's own windscreen ejection with a higher speed when buckled; the exit key is blocked while buckled)
 * and cruise control (the vehicle's top speed held at the speed it had). The HUD reads the local `seatbelt` state.
 */
class Driving {
  private belted = false;
  private cruising = false;
  private readonly blockExit = new TickLoop(() => {
    DisableControlAction(0, 75, true);
    DisableControlAction(27, 75, true);
  });

  constructor() {
    this.applyEject();
    onSettings(() => this.applyEject());
    onCache("vehicle", (vehicle) => {
      if (vehicle === false) this.reset();
    });
  }

  private applyEject(): void {
    // The HUD shows the belt warning only while this state is a boolean.
    if (!content.settings.seatbelt && this.belted) this.setBelt(false);
    LocalPlayer.state.set(
      "seatbelt",
      content.settings.seatbelt ? this.belted : null,
      false,
    );
    const kmh = this.belted
      ? content.settings.ejectBelted
      : content.settings.ejectUnbelted;
    SetFlyThroughWindscreenParams(kmh / 3.6, 1.0, 17.0, 10.0);
  }

  private reset(): void {
    if (this.belted) this.setBelt(false);
    this.cruising = false;
  }

  private setBelt(on: boolean): void {
    this.belted = on;
    this.blockExit.set(on);
    this.applyEject();
  }

  toggleBelt(): void {
    if (
      !content.settings.seatbelt ||
      cache.vehicle === false ||
      NO_BELT.has(GetVehicleClass(cache.vehicle))
    )
      return;
    this.setBelt(!this.belted);
    notify(
      Locale(this.belted ? "SMALL_BELT_ON" : "SMALL_BELT_OFF"),
      "info",
      1500,
    );
  }

  toggleCruise(): void {
    const vehicle = cache.vehicle;
    if (
      !content.settings.cruise ||
      vehicle === false ||
      GetPedInVehicleSeat(vehicle, -1) !== cache.ped
    )
      return;
    this.cruising = !this.cruising;
    // 0 gives the vehicle its own top speed back.
    SetVehicleMaxSpeed(vehicle, this.cruising ? GetEntitySpeed(vehicle) : 0);
    notify(
      Locale(this.cruising ? "SMALL_CRUISE_ON" : "SMALL_CRUISE_OFF"),
      "info",
      1500,
    );
  }
}

const driving = new Driving();
on(
  "onResourceStop",
  (resource: string) =>
    resource === ResourceName && LocalPlayer.state.set("seatbelt", null, false),
);
new Keybind({
  name: "smallresources_belt",
  description: Locale("KEYBIND_SEATBELT"),
  defaultKey: "B",
  onPressed: () => driving.toggleBelt(),
});
new Keybind({
  name: "smallresources_cruise",
  description: Locale("KEYBIND_CRUISE"),
  defaultKey: "Y",
  onPressed: () => driving.toggleCruise(),
});

/** Passengers stay in their seat when the driver seat empties. */
const noShuffle = () =>
  SetPedConfigFlag(cache.ped, 184, content.settings.noShuffle);
noShuffle();
onCache("ped", noShuffle);
onSettings(noShuffle);
