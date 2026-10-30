import {
  cache,
  Keybind,
  onCache,
  PlayerState,
  requestAnimDict,
  stateBoolean,
  TickLoop,
} from "@aicore-fivem/lib/client";
import { PLAYER_BAGS } from "@aicore-fivem/shared";
import { Locale } from "common";
import { content } from "./settings";

const DICT = "anim@mp_point";
const dead = new PlayerState(PLAYER_BAGS.dead, stateBoolean);
const cuffed = new PlayerState(PLAYER_BAGS.cuffed, stateBoolean);

/** Finger pointing: GTA's pointing move network, aimed every frame with the gameplay camera. */
class Pointing {
  private active = false;
  private readonly frame = new TickLoop(() => this.aim());

  async toggle(): Promise<void> {
    if (this.active) return this.stop();
    if (
      !content.settings.point ||
      cache.vehicle !== false ||
      dead.get(cache.serverId) === true ||
      cuffed.get(cache.serverId) === true
    )
      return;
    if (!(await requestAnimDict(DICT).catch(() => false))) return;
    this.active = true;
    SetPedCurrentWeaponVisible(cache.ped, false, true, true, true);
    SetPedConfigFlag(cache.ped, 36, true);
    TaskMoveNetworkByName(cache.ped, "task_mp_pointing", 0.5, false, DICT, 24);
    RemoveAnimDict(DICT);
    this.frame.set(true);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.frame.set(false);
    const ped = cache.ped;
    RequestTaskMoveNetworkStateTransition(ped, "Stop");
    if (!IsPedInjured(ped)) ClearPedSecondaryTask(ped);
    if (cache.vehicle === false)
      SetPedCurrentWeaponVisible(ped, true, true, true, true);
    SetPedConfigFlag(ped, 36, false);
  }

  private aim(): void {
    const ped = cache.ped;
    if (!IsTaskMoveNetworkActive(ped)) return this.stop();
    const relHeading = GetGameplayCamRelativeHeading();
    const pitch = Math.max(-70, Math.min(42, GetGameplayCamRelativePitch()));
    const heading = (Math.max(-180, Math.min(180, relHeading)) + 180) / 360;
    const rad = (relHeading * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const reach = 0.4 * heading + 0.3;
    const [x = 0, y = 0, z = 0] = GetOffsetFromEntityInWorldCoords(
      ped,
      cos * -0.2 - sin * reach,
      sin * -0.2 + cos * reach,
      0.6,
    );
    const ray = StartShapeTestCapsule(
      x,
      y,
      z - 0.2,
      x,
      y,
      z + 0.2,
      0.4,
      95,
      ped,
      7,
    );
    const [, blocked] = GetShapeTestResult(ray);
    SetTaskMoveNetworkSignalFloat(ped, "Pitch", (pitch + 70) / 112);
    SetTaskMoveNetworkSignalFloat(ped, "Heading", 1 - heading);
    SetTaskMoveNetworkSignalBool(ped, "isBlocked", Boolean(blocked));
    SetTaskMoveNetworkSignalBool(
      ped,
      "isFirstPerson",
      GetCamViewModeForContext(GetCamActiveViewModeContext()) === 4,
    );
  }
}

const pointing = new Pointing();
new Keybind({
  name: "smallresources_point",
  description: Locale("KEYBIND_POINT"),
  defaultKey: "B",
  onPressed: () => void pointing.toggle(),
});
onCache("vehicle", (vehicle) => {
  if (vehicle !== false) pointing.stop();
});
