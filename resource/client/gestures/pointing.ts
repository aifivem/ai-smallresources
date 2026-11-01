import { cache, requestAnimDict, TickLoop } from "@aicore-fivem/lib/client";
import { content } from "../settings";
import { helpless, mine } from "./guards";

const POINT_DICT = "anim@mp_point";

/**
 * Finger pointing: GTA's pointing move network, aimed every frame with the gameplay camera. The "blocked" probe is an
 * async shape test: each frame reads the previous frame's result once it is ready, then starts the next one.
 */
export class Pointing {
  active = false;
  private readonly frame = new TickLoop(() => this.aim());
  private probe = 0;
  private blocked = false;

  /** `lowerHands` ends a hands up (the two gestures never run together). */
  constructor(private readonly lowerHands: () => void) {}

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
    this.lowerHands();
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
    this.probe = 0;
    this.blocked = false;
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
    if (this.probe) {
      // Status 1 = still running, 2 = ready, 0 = the handle is gone.
      const [status, hit] = GetShapeTestResult(this.probe);
      if (status === 2) this.blocked = Boolean(hit);
      if (status !== 1) this.probe = 0;
    }
    if (!this.probe)
      this.probe = StartShapeTestCapsule(
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
    SetTaskMoveNetworkSignalFloat(ped, "Pitch", (pitch + 70) / 112);
    SetTaskMoveNetworkSignalFloat(ped, "Heading", 1 - heading);
    SetTaskMoveNetworkSignalBool(ped, "isBlocked", this.blocked);
    SetTaskMoveNetworkSignalBool(
      ped,
      "isFirstPerson",
      GetCamViewModeForContext(GetCamActiveViewModeContext()) === 4,
    );
  }
}
