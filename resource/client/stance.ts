import { cache, every, onCache } from "@aicore-fivem/lib/client";
import { content, onSettings } from "./settings";

/** A second jump within this time trips the player. */
const HOP_MS = 5000;
const CHECK_MS = 100;

/**
 * On foot: GTA's combat stance (action mode, the hunched walk after a punch or a shot) is switched off again, and a
 * second jump within 5 s makes the player fall.
 */
class Stance {
  private readonly job = every(CHECK_MS, () => this.check(), {
    active: false,
    name: "stance",
  });
  private jumping = false;
  private hopUntil = 0;

  watch(): void {
    const s = content.settings;
    this.job.set(cache.vehicle === false && (s.noActionMode || s.noBunnyHop));
  }

  private check(): void {
    const ped = cache.ped;
    const s = content.settings;
    // While aiming (config flag 78) the game holds action mode itself.
    if (
      s.noActionMode &&
      IsPedUsingActionMode(ped) &&
      !GetPedConfigFlag(ped, 78, true)
    )
      SetPedUsingActionMode(ped, false, -1, "DEFAULT_ACTION");
    if (s.noBunnyHop) this.hop(ped);
  }

  private hop(ped: number): void {
    const jumping = IsPedJumping(ped);
    if (jumping && !this.jumping) {
      const now = GetGameTimer();
      if (now < this.hopUntil) setTimeout(() => trip(), 600);
      else this.hopUntil = now + HOP_MS;
    }
    this.jumping = jumping;
  }
}

function trip(): void {
  const ped = cache.ped;
  if (
    IsPedClimbing(ped) ||
    IsPedFalling(ped) ||
    IsPedInParachuteFreeFall(ped) ||
    GetPedParachuteState(ped) > 0
  )
    return;
  SetPedToRagdoll(ped, 1500, 1500, 2, false, false, false);
}

const stance = new Stance();
stance.watch();
onCache("vehicle", () => stance.watch());
onSettings(() => stance.watch());
