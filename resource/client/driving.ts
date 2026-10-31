import { SEATBELT_EVENT } from "@aicore-fivem/shared";
import {
  cache,
  controls,
  every,
  Keybind,
  notify,
  onCache,
  onStop,
  registerExport,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
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

  constructor() {
    this.applyEject();
    onSettings(() => this.applyEject());
    onCache("vehicle", (vehicle) => {
      if (vehicle === false) this.reset();
    });
  }

  /** The belt as HUDs show it: a local event on change, the export for late starters. */
  worn: boolean | null = null;

  announce(worn: boolean | null): void {
    if (worn === this.worn) return;
    this.worn = worn;
    emit(SEATBELT_EVENT, worn);
  }

  private applyEject(): void {
    // The HUD shows the belt warning only while this state is a boolean.
    if (!content.settings.seatbelt && this.belted) this.setBelt(false);
    this.announce(content.settings.seatbelt ? this.belted : null);
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
    if (on) {
      controls.disable("seatbelt", [75]);
      controls.disable("seatbelt:vehicle", [75], 27);
    } else {
      controls.enable("seatbelt");
      controls.enable("seatbelt:vehicle");
    }
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
    if (!content.settings.cruise || vehicle === false || cache.seat !== -1)
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
registerExport("GetSeatbelt", () => driving.worn);
onStop(() => driving.announce(null));
new Keybind({
  name: "smallresources_belt",
  description: Locale("KEYBIND_SEATBELT"),
  defaultKey: "K",
  hint: "vehicle",
  icon: "user-shield",
  hintLabel: Locale("HINT_BELT"),
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

/** Boats, helicopters and planes keep mouse control and steering in the air. */
const FLYING_OR_FLOATING = new Set([14, 15, 16]);
/** Lean and roll keys of a land vehicle. */
const AIR_CONTROLS = [59, 60];

/** Mouse steering off in land vehicles; leaning and rolling off while all wheels are in the air. */
class VehicleControl {
  private readonly air = every(100, () => this.checkAir(), {
    active: false,
    name: "airControl",
  });

  apply(): void {
    const vehicle = cache.vehicle;
    const land =
      vehicle !== false && !FLYING_OR_FLOATING.has(GetVehicleClass(vehicle));
    if (land && content.settings.noMouseSteer)
      controls.disable("mousesteer", [106]);
    else controls.enable("mousesteer");
    const watch = land && cache.seat === -1 && content.settings.noAirControl;
    this.air.set(watch);
    if (!watch) controls.enable("aircontrol");
  }

  private checkAir(): void {
    const inAir = cache.vehicle !== false && IsEntityInAir(cache.vehicle);
    if (inAir === controls.isDisabled("aircontrol")) return;
    if (inAir) controls.disable("aircontrol", AIR_CONTROLS);
    else controls.enable("aircontrol");
  }
}

const vehicleControl = new VehicleControl();
vehicleControl.apply();
onCache("vehicle", () => vehicleControl.apply());
onCache("seat", () => vehicleControl.apply());
onSettings(() => vehicleControl.apply());
