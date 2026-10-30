import { cache, Keybind, notify, onServerEvent, progress, requestPtfxAsset, TickLoop, triggerServerCallback } from "@aicore-fivem/lib/client";
import { asArgs, record, sleep } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, FIREWORKS } from "common/small";

const MAX_FOV = 70;
const MIN_FOV = 5;

/**
 * A handheld camera view: the binoculars item (binocular overlay, scenario) or the held news camera (news overlay,
 * the holding animation keeps running); scroll zooms, Backspace closes.
 */
export class Binoculars {
  private cam = 0;
  private scaleform = 0;
  private fov = (MAX_FOV + MIN_FOV) / 2;
  private readonly frame = new TickLoop(() => this.draw());

  get active(): boolean {
    return this.cam !== 0;
  }

  private news = false;

  open(news = false): void {
    if (this.active || cache.vehicle !== false || IsPedSwimming(cache.ped)) return;
    this.news = news;
    if (!news) TaskStartScenarioInPlace(cache.ped, "WORLD_HUMAN_BINOCULARS", 0, true);
    this.cam = CreateCam("DEFAULT_SCRIPTED_FLY_CAMERA", true);
    AttachCamToEntity(this.cam, cache.ped, 0.0, 0.2, 0.7, true);
    SetCamRot(this.cam, 0.0, 0.0, GetEntityHeading(cache.ped), 2);
    SetCamFov(this.cam, this.fov);
    RenderScriptCams(true, false, 500, true, false);
    this.scaleform = RequestScaleformMovie(news ? "BREAKING_NEWS" : "BINOCULARS");
    this.frame.set(true);
  }

  close(): void {
    if (!this.active) return;
    this.frame.set(false);
    if (!this.news) ClearPedTasks(cache.ped);
    RenderScriptCams(false, false, 500, true, false);
    DestroyCam(this.cam, false);
    SetScaleformMovieAsNoLongerNeeded(this.scaleform);
    this.cam = 0;
    this.fov = (MAX_FOV + MIN_FOV) / 2;
  }

  private draw(): void {
    const zoom = (this.fov - MIN_FOV) / (MAX_FOV - MIN_FOV);
    const x = GetDisabledControlNormal(0, 220);
    const y = GetDisabledControlNormal(0, 221);
    if (x !== 0 || y !== 0) {
      const [rx = 0, , rz = 0] = GetCamRot(this.cam, 2);
      const heading = rz - x * 8 * (zoom + 0.1);
      SetCamRot(this.cam, Math.max(-89.5, Math.min(20, rx - y * 8 * (zoom + 0.1))), 0.0, heading, 2);
      SetEntityHeading(cache.ped, heading);
    }
    if (IsControlJustPressed(0, 241)) this.fov = Math.max(MIN_FOV, this.fov - 10);
    if (IsControlJustPressed(0, 242)) this.fov = Math.min(MAX_FOV, this.fov + 10);
    SetCamFov(this.cam, GetCamFov(this.cam) + (this.fov - GetCamFov(this.cam)) * 0.05);
    HideHudAndRadarThisFrame();
    if (HasScaleformMovieLoaded(this.scaleform)) DrawScaleformMovieFullscreen(this.scaleform, 255, 255, 255, 255, 0);
  }
}

export const binoculars = new Binoculars();
onServerEvent(EVENTS.binoculars, () => (binoculars.active ? binoculars.close() : binoculars.open()));
new Keybind({ name: "smallresources_binoculars_BACK", description: Locale("KEYBIND_BINOCULARS_CLOSE"), defaultKey: "BACK", onPressed: () => binoculars.close() });

onServerEvent(
  EVENTS.fireworkPlace,
  { args: ([token]) => asArgs(typeof token === "number" ? token : null) },
  async (token) => {
    const placed = await progress({ label: Locale("SMALL_FIREWORK_PLACING"), duration: 3000, anim: { dict: "anim@mp_fireworks", clip: "place_firework_3_box" } });
    if (!placed) return;
    const result = record(await triggerServerCallback(EVENTS.fireworkPlaced, [token]).catch(() => null));
    if (result.ok === true) notify(Locale("SMALL_FIREWORK_RUN"), "warning", 3000);
  },
);

/** A firework someone placed nearby: after a short fuse, a burst of effects high above it. */
onServerEvent(
  EVENTS.firework,
  {
    args: ([x, y, z, item]): [number, number, number, string] | null =>
      typeof x === "number" && typeof y === "number" && typeof z === "number" && typeof item === "string" && item in FIREWORKS ? [x, y, z, item] : null,
  },
  async (x, y, z, item) => {
    const firework = FIREWORKS[item];
    if (!firework) return;
    const asset = await requestPtfxAsset(firework.asset).catch(() => null);
    if (!asset) return;
    await sleep(5000);
    for (let i = 0; i < 12; i++) {
      const effect = firework.effects[Math.floor(Math.random() * firework.effects.length)] ?? "";
      UseParticleFxAsset(asset);
      StartParticleFxNonLoopedAtCoord(effect, x, y, z + 40 + Math.random() * 15, 0, 0, 0, 0.5 + Math.random() * 0.3, false, false, false);
      await sleep(900);
    }
    RemoveNamedPtfxAsset(asset);
  },
);
