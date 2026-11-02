import {
  cache,
  controls,
  every,
  notify,
  onCache,
  TickLoop,
} from "@aifivem/lib/client";
import { Locale } from "common";
import { content, onWeapons } from "./settings";

const AIM = 25;
const ATTACK = 24;
const JUMP = 22;
const MOVE_LR = 30;
const LEFT = 34;
const RIGHT = 35;
/** Melee attack keys (light, heavy, alternate). */
const MELEE = [140, 141, 142];

/**
 * Firing rules: no shot from cover without aiming or while ghosted (checked every 100 ms with a weapon), and on foot
 * every frame: no firing or melee without the aim key held, no combat roll while aiming, and an A / D tap macro while
 * aiming is broken by a forced step.
 */
class FireRules {
  private covered = false;
  private meleeBlocked = false;
  private rollBlocked = false;
  private taps = 0;
  private breakUntil = 0;
  private readonly cover = every(100, () => this.checkCover(), {
    active: false,
    name: "coverFire",
  });
  private readonly strafe = every(1000, () => this.checkStrafe(), {
    active: false,
    name: "antiStrafe",
  });
  private readonly frame = new TickLoop(() => this.tick());

  apply(): void {
    const w = content.weapons;
    const armed = cache.weapon !== false;
    const onFoot = cache.vehicle === false;
    this.cover.set(w.noCoverFire && armed);
    if (!this.cover.running) this.covered = false;
    this.strafe.set(w.antiStrafe && armed && onFoot);
    this.frame.set(
      this.covered ||
        (onFoot &&
          (w.aimToFire || (armed && (w.noCombatRoll || w.antiStrafe)))),
    );
    if (!this.frame.running) {
      this.blockMelee(false);
      this.blockRoll(false);
    }
  }

  private checkCover(): void {
    const ped = cache.ped;
    const covered =
      (IsPedInCover(ped, false) && !IsPlayerFreeAiming(cache.playerId)) ||
      IsEntityGhostedToLocalPlayer(ped);
    if (covered === this.covered) return;
    this.covered = covered;
    this.apply();
  }

  private checkStrafe(): void {
    if (
      this.taps > content.weapons.strafeTaps &&
      IsPlayerFreeAiming(cache.playerId)
    )
      this.breakUntil = GetGameTimer() + content.weapons.strafeBreakMs;
    this.taps = 0;
  }

  private tick(): void {
    const w = content.weapons;
    const armed = cache.weapon !== false;
    const onFoot = cache.vehicle === false;
    const aimHeld = IsDisabledControlPressed(0, AIM);
    const noAim = onFoot && w.aimToFire && !aimHeld;
    if (this.covered || noAim) DisablePlayerFiring(cache.playerId, true);
    if (this.covered && IsDisabledControlJustPressed(0, ATTACK))
      notify(Locale("SMALL_CANNOT_FIRE"), "error", 1500);
    this.blockMelee(noAim);
    this.blockRoll(onFoot && armed && w.noCombatRoll && aimHeld);
    if (!onFoot || !armed || !w.antiStrafe) return;
    if (IsControlJustPressed(0, LEFT) || IsControlJustPressed(0, RIGHT))
      this.taps++;
    if (GetGameTimer() < this.breakUntil) SetControlNormal(0, MOVE_LR, 1);
  }

  private blockMelee(on: boolean): void {
    if (on === this.meleeBlocked) return;
    this.meleeBlocked = on;
    if (on) controls.disable("aimToFire", MELEE);
    else controls.enable("aimToFire");
  }

  private blockRoll(on: boolean): void {
    if (on === this.rollBlocked) return;
    this.rollBlocked = on;
    if (on) controls.disable("combatRoll", [JUMP]);
    else controls.enable("combatRoll");
  }
}

const rules = new FireRules();
rules.apply();
onWeapons(() => rules.apply());
onCache("weapon", () => rules.apply());
onCache("vehicle", () => rules.apply());
