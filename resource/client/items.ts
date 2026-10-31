import {
  cache,
  hud,
  Keybind,
  keyHints,
  onServerEvent,
  requestPtfxAsset,
  ScriptCamera,
  TickLoop,
} from "@aicore-fivem/lib/client";
import { readFinite, sleep } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { FIREWORKS } from "common/items";
import { EVENTS } from "common/small";

const MAX_FOV = 70;
const MIN_FOV = 5;

/**
 * A handheld camera view: the binoculars item (binocular overlay, scenario) or the held news camera (news overlay,
 * the holding animation keeps running); the zoom and close keybinds show as key hints while it is open, and the HUD
 * hides (lib `hud`).
 */
export class Binoculars {
  private readonly camera = new ScriptCamera("DEFAULT_SCRIPTED_FLY_CAMERA");
  private scaleform = 0;
  private fov = (MAX_FOV + MIN_FOV) / 2;
  private readonly frame = new TickLoop(() => this.draw());

  get active(): boolean {
    return this.camera.active;
  }

  private news = false;

  open(news = false): void {
    if (this.active || cache.vehicle !== false || IsPedSwimming(cache.ped))
      return;
    this.news = news;
    if (!news)
      TaskStartScenarioInPlace(cache.ped, "WORLD_HUMAN_BINOCULARS", 0, true);
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    this.camera.start(
      { x, y, z },
      {
        rotation: { x: 0, y: 0, z: GetEntityHeading(cache.ped) },
        fov: this.fov,
      },
    );
    this.camera.attach(cache.ped, { x: 0, y: 0.2, z: 0.7 });
    this.scaleform = RequestScaleformMovie(
      news ? "BREAKING_NEWS" : "BINOCULARS",
    );
    this.frame.set(true);
    hud.hide("binoculars");
    keyHints.show("binoculars_zoom", {
      label: Locale("HINT_BINOCULARS_ZOOM"),
      keybind: "smallresources_zoom_in",
      icon: "magnifying-glass-plus",
    });
    keyHints.show("binoculars_close", {
      label: Locale("HINT_BINOCULARS_CLOSE"),
      keybind: "smallresources_binoculars",
      icon: "xmark",
    });
  }

  /** Scroll: a step of the field of view (only while the view is open). */
  zoom(step: number): void {
    if (this.active)
      this.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, this.fov + step));
  }

  close(): void {
    if (!this.active) return;
    this.frame.set(false);
    if (!this.news) ClearPedTasks(cache.ped);
    this.camera.stop();
    SetScaleformMovieAsNoLongerNeeded(this.scaleform);
    this.fov = (MAX_FOV + MIN_FOV) / 2;
    hud.show("binoculars");
    keyHints.hide("binoculars_zoom");
    keyHints.hide("binoculars_close");
  }

  private draw(): void {
    const zoom = (this.fov - MIN_FOV) / (MAX_FOV - MIN_FOV);
    const x = GetDisabledControlNormal(0, 220);
    const y = GetDisabledControlNormal(0, 221);
    if (x !== 0 || y !== 0) {
      const [rx = 0, , rz = 0] = GetCamRot(this.camera.cam, 2);
      const heading = rz - x * 8 * (zoom + 0.1);
      SetCamRot(
        this.camera.cam,
        Math.max(-89.5, Math.min(20, rx - y * 8 * (zoom + 0.1))),
        0.0,
        heading,
        2,
      );
      SetEntityHeading(cache.ped, heading);
    }
    SetCamFov(
      this.camera.cam,
      GetCamFov(this.camera.cam) +
        (this.fov - GetCamFov(this.camera.cam)) * 0.05,
    );
    if (HasScaleformMovieLoaded(this.scaleform))
      DrawScaleformMovieFullscreen(this.scaleform, 255, 255, 255, 255, 0);
  }
}

export const binoculars = new Binoculars();
onServerEvent(EVENTS.binoculars, () =>
  binoculars.active ? binoculars.close() : binoculars.open(),
);
new Keybind({
  name: "smallresources_binoculars",
  description: Locale("KEYBIND_BINOCULARS_CLOSE"),
  defaultKey: "BACK",
  onPressed: () => binoculars.close(),
});
new Keybind({
  name: "smallresources_zoom_in",
  description: Locale("KEYBIND_BINOCULARS_ZOOM_IN"),
  defaultKey: "IOM_WHEEL_UP",
  defaultMapper: "MOUSE_WHEEL",
  onPressed: () => binoculars.zoom(-10),
});
new Keybind({
  name: "smallresources_zoom_out",
  description: Locale("KEYBIND_BINOCULARS_ZOOM_OUT"),
  defaultKey: "IOM_WHEEL_DOWN",
  defaultMapper: "MOUSE_WHEEL",
  onPressed: () => binoculars.zoom(10),
});
/** A firework someone placed nearby: after a short fuse, a burst of effects high above it. */
onServerEvent(
  EVENTS.firework,
  {
    args: ([x, y, z, item]): [number, number, number, string] | null => {
      const [px, py, pz] = [readFinite(x), readFinite(y), readFinite(z)];
      return px !== null &&
        py !== null &&
        pz !== null &&
        typeof item === "string" &&
        item in FIREWORKS
        ? [px, py, pz, item]
        : null;
    },
  },
  async (x, y, z, item) => {
    const firework = FIREWORKS[item];
    if (!firework) return;
    const asset = await requestPtfxAsset(firework.asset).catch(() => null);
    if (!asset) return;
    await sleep(5000);
    for (let i = 0; i < 12; i++) {
      const effect =
        firework.effects[Math.floor(Math.random() * firework.effects.length)] ??
        "";
      UseParticleFxAsset(asset);
      StartParticleFxNonLoopedAtCoord(
        effect,
        x,
        y,
        z + 40 + Math.random() * 15,
        0,
        0,
        0,
        0.5 + Math.random() * 0.3,
        false,
        false,
        false,
      );
      await sleep(900);
    }
    RemoveNamedPtfxAsset(asset);
  },
);
