import { cache, controls, every, Keybind, onCache } from "@aifivem/lib/client";
import { Locale } from "common";
import { content, onSettings } from "./settings";

/** GTA's camera views: 0 third person close, 1 middle (skipped), 4 first person. */
const THIRD = 0;
const FIRST = 4;
/** The follow vehicle camera's closest zoom, used while aiming from a vehicle. */
const AIM_ZOOM = 4;
/** GTA's own view key (V): the keybind below takes its place so the middle view never comes. */
const NEXT_CAMERA = 0;

/**
 * Vehicle camera: aiming from a vehicle moves the camera in close and back after, the middle view is skipped and V
 * switches between first and third person (on foot and in vehicles).
 */
class VehicleCam {
  private savedZoom = -1;
  private readonly aim = every(100, () => this.checkAim(), {
    active: false,
    name: "vehicleCam",
  });

  apply(): void {
    const on = content.settings.vehicleCam;
    if (on) controls.disable("vehicleCam", [NEXT_CAMERA]);
    else controls.enable("vehicleCam");
    this.aim.set(on && cache.vehicle !== false);
    if (!this.aim.running) this.restore();
  }

  toggle(): void {
    if (!content.settings.vehicleCam) return;
    const current =
      cache.vehicle !== false
        ? GetFollowVehicleCamViewMode()
        : GetFollowPedCamViewMode();
    const next = current === FIRST ? THIRD : FIRST;
    SetFollowPedCamViewMode(next);
    SetFollowVehicleCamViewMode(next);
  }

  private checkAim(): void {
    if (IsPlayerFreeAiming(cache.playerId)) {
      const zoom = GetFollowVehicleCamZoomLevel();
      if (zoom === AIM_ZOOM) return;
      this.savedZoom = zoom;
      SetFollowVehicleCamZoomLevel(AIM_ZOOM);
    } else this.restore();
  }

  private restore(): void {
    if (this.savedZoom < 0) return;
    SetFollowVehicleCamZoomLevel(this.savedZoom);
    this.savedZoom = -1;
  }
}

const cam = new VehicleCam();
cam.apply();
onSettings(() => cam.apply());
onCache("vehicle", () => cam.apply());
new Keybind({
  name: "smallresources_view",
  description: Locale("KEYBIND_VIEW"),
  defaultKey: "V",
  onPressed: () => cam.toggle(),
});
