import {
  cache,
  controls,
  Keybind,
  onCache,
  PlayerState,
  registerExport,
  requestAnimDict,
  stateBoolean,
  TickLoop,
  gestures,
} from "@aicore-fivem/lib/client";
import { PLAYER_BAGS } from "@aicore-fivem/shared";
import { Locale } from "common";
import { content } from "./settings";

const dead = new PlayerState(PLAYER_BAGS.dead, stateBoolean);
const cuffed = new PlayerState(PLAYER_BAGS.cuffed, stateBoolean);
/** Another emote script (tgiann-emotes) does the gestures: these keys stay quiet so the two never fight. */
const mine = () => gestures.provider() === "ai-smallresources";
const helpless = () =>
  dead.get(cache.serverId) === true || cuffed.get(cache.serverId) === true;

/** Task ids of scripted animations, synced scenes and scenarios: GTA has no "plays any animation" check. */
const ANIM_TASKS = [134, 135, 118];
const playingAnimation = (ped: number) =>
  ANIM_TASKS.some((task) => GetIsTaskActive(ped, task));

const POINT_DICT = "anim@mp_point";

/** Finger pointing: GTA's pointing move network, aimed every frame with the gameplay camera. */
class Pointing {
  active = false;
  private readonly frame = new TickLoop(() => this.aim());

  /** On foot, upright, not aiming, falling, fighting or knocked over. */
  private possible(ped: number): boolean {
    return (
      cache.vehicle === false &&
      !helpless() &&
      IsPedHuman(ped) &&
      !IsPedOnAnyBike(ped) &&
      !IsPlayerFreeAiming(cache.playerId) &&
      !IsAimCamActive() &&
      !IsPedFalling(ped) &&
      !IsPedInjured(ped) &&
      !IsPedInMeleeCombat(ped) &&
      !IsPedRagdoll(ped)
    );
  }

  async toggle(): Promise<void> {
    if (this.active) return this.stop();
    if (!content.settings.point || !mine() || !this.possible(cache.ped)) return;
    if (!(await requestAnimDict(POINT_DICT).catch(() => false))) return;
    hands.down();
    this.active = true;
    SetPedConfigFlag(cache.ped, 36, true);
    TaskMoveNetworkByName(
      cache.ped,
      "task_mp_pointing",
      0.5,
      false,
      POINT_DICT,
      24,
    );
    RemoveAnimDict(POINT_DICT);
    this.frame.set(true);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.frame.set(false);
    const ped = cache.ped;
    RequestTaskMoveNetworkStateTransition(ped, "Stop");
    SetPedConfigFlag(ped, 36, false);
    if (!IsPedInjured(ped)) ClearPedSecondaryTask(ped);
  }

  private aim(): void {
    const ped = cache.ped;
    if (!this.possible(ped) || !IsTaskMoveNetworkActive(ped))
      return this.stop();
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

const HANDS = { dict: "random@mugging3", clip: "handsup_standing_base" };
/** Entering vehicles, cover, fighting, aiming and vehicle attack / weapon keys while the hands are up. */
const HANDS_CONTROLS = [
  23, 24, 25, 36, 44, 53, 54, 59, 60, 61, 62, 63, 64, 65, 66, 67, 69, 70, 74,
  75, 77, 78, 80, 86, 91, 102, 104, 105, 136, 137, 139, 140, 141, 142, 143, 257,
  263, 264, 337, 338, 339, 340, 341, 342, 343, 345, 346, 347, 351, 354, 357,
];

/** Hands up (also in a vehicle): an upper body loop; ends by itself when another animation, a fall or death replaces it. */
class HandsUp {
  active = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  async toggle(): Promise<void> {
    if (this.active) return this.down();
    const ped = cache.ped;
    if (!content.settings.handsUp || !mine() || helpless() || IsPedRagdoll(ped))
      return;
    // Another script's animation keeps running; the key does not raise the hands over it.
    if (playingAnimation(ped)) return;
    if (!(await requestAnimDict(HANDS.dict).catch(() => false))) return;
    pointing.stop();
    this.active = true;
    TaskPlayAnim(
      ped,
      HANDS.dict,
      HANDS.clip,
      3,
      3,
      -1,
      49,
      0,
      false,
      false,
      false,
    );
    controls.disable("handsup", HANDS_CONTROLS);
    this.timer = setInterval(() => {
      const now = cache.ped;
      if (
        helpless() ||
        IsPedRagdoll(now) ||
        !IsEntityPlayingAnim(now, HANDS.dict, HANDS.clip, 3)
      )
        this.down();
    }, 250);
  }

  down(): void {
    if (!this.active) return;
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    controls.enable("handsup");
    StopAnimTask(cache.ped, HANDS.dict, HANDS.clip, 3);
  }
}

/** Ragdoll while the key is held: GTA's ragdoll kept alive every frame. */
const ragdoll = new TickLoop(() => {
  const ped = cache.ped;
  if (cache.vehicle !== false || helpless()) return ragdoll.set(false);
  SetPedRagdollForceFall(ped);
  ResetPedRagdollTimer(ped);
  SetPedToRagdoll(ped, 1000, 1000, 3, false, false, false);
});

const pointing = new Pointing();
const hands = new HandsUp();
new Keybind({
  name: "smallresources_point",
  description: Locale("KEYBIND_POINT"),
  defaultKey: "B",
  hint: "foot",
  icon: "hand-point-up",
  hintLabel: Locale("HINT_POINT"),
  onPressed: () => void pointing.toggle(),
});
new Keybind({
  name: "smallresources_handsup",
  description: Locale("KEYBIND_HANDS_UP"),
  defaultKey: "X",
  hint: "foot",
  icon: "hand",
  hintLabel: Locale("HINT_HANDSUP"),
  onPressed: () => void hands.toggle(),
});
new Keybind({
  name: "smallresources_ragdoll",
  description: Locale("KEYBIND_RAGDOLL"),
  defaultKey: "M",
  hint: "foot",
  icon: "person-falling",
  hintLabel: Locale("HINT_RAGDOLL"),
  onPressed: () => {
    if (
      content.settings.ragdoll &&
      mine() &&
      IsPedOnFoot(cache.ped) &&
      !helpless()
    ) {
      pointing.stop();
      hands.down();
      ragdoll.set(true);
    }
  },
  onReleased: () => ragdoll.set(false),
});
onCache("vehicle", (vehicle) => {
  if (vehicle !== false) pointing.stop();
});

// Other scripts (a police search) ask whether the player shows their hands.
registerExport("IsHandsUp", () => hands.active);
registerExport("IsPointing", () => pointing.active);
