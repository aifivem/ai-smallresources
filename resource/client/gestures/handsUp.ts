import { cache, controls, every, player } from "@aicore-fivem/lib/client";
import { content } from "../settings";
import { helpless, mine, playingAnimation } from "./guards";

const HANDS = { dict: "random@mugging3", clip: "handsup_standing_base" };
/** Entering vehicles, cover, fighting, aiming and vehicle attack / weapon keys while the hands are up. */
const HANDS_CONTROLS = [
  23, 24, 25, 36, 44, 53, 54, 59, 60, 61, 62, 63, 64, 65, 66, 67, 69, 70, 74,
  75, 77, 78, 80, 86, 91, 102, 104, 105, 136, 137, 139, 140, 141, 142, 143, 257,
  263, 264, 337, 338, 339, 340, 341, 342, 343, 345, 346, 347, 351, 354, 357,
];

/** Hands up (also in a vehicle): an upper body loop; ends by itself when another animation, a fall or death replaces it. */
export class HandsUp {
  active = false;
  private readonly job = every(
    250,
    () => {
      const now = cache.ped;
      if (
        helpless() ||
        IsPedRagdoll(now) ||
        !IsEntityPlayingAnim(now, HANDS.dict, HANDS.clip, 3)
      )
        this.down();
    },
    { active: false, name: "handsUp" },
  );

  /** `stopPointing` ends finger pointing (the two gestures never run together). */
  constructor(private readonly stopPointing: () => void) {}

  async toggle(): Promise<void> {
    if (this.active) return this.down();
    const ped = cache.ped;
    if (!content.settings.handsUp || !mine() || helpless() || IsPedRagdoll(ped))
      return;
    // Another script's animation keeps running; the key does not raise the hands over it.
    if (playingAnimation(ped)) return;
    this.stopPointing();
    this.active = true;
    const started = await player
      .playAnim(HANDS.dict, HANDS.clip, { blendIn: 3, blendOut: 3, flag: 49 })
      .then(() => true)
      .catch(() => false);
    if (!started || !this.active) {
      this.active = false;
      return;
    }
    controls.disable("handsup", HANDS_CONTROLS);
    this.job.set(true);
  }

  down(): void {
    if (!this.active) return;
    this.active = false;
    this.job.set(false);
    controls.enable("handsup");
    StopAnimTask(cache.ped, HANDS.dict, HANDS.clip, 3);
  }
}
