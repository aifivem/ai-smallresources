import { cache, onCache, onShot, onStop } from "@aifivem/lib/client";
import { content, onWeapons } from "./settings";

/**
 * Recoil: each shot lifts the camera by the panel's degrees for the weapon (its own row, else its group's). Any
 * inventory: only the weapon hash in hand counts.
 */
class Recoil {
  private groups = new Map<number, number>();
  private weapons = new Map<number, number>();
  private kick = 0;
  private stopShots: (() => void) | null = null;

  apply(): void {
    const w = content.weapons;
    this.groups = new Map(
      w.recoilGroups.map((r) => [Number(r.key) >>> 0, r.pitch]),
    );
    this.weapons = new Map(
      w.recoilWeapons.map((r) => [GetHashKey(String(r.key)) >>> 0, r.pitch]),
    );
    if (w.recoil && !this.stopShots) this.stopShots = onShot(() => this.shot());
    else if (!w.recoil && this.stopShots) {
      this.stopShots();
      this.stopShots = null;
    }
    this.held(cache.weapon);
  }

  /** The kick of the weapon now in hand (`GetWeapontypeGroup` can answer signed: `>>> 0`). */
  held(weapon: number | false): void {
    if (weapon === false) return void (this.kick = 0);
    const hash = weapon >>> 0;
    this.kick =
      this.weapons.get(hash) ??
      this.groups.get(GetWeapontypeGroup(weapon) >>> 0) ??
      0;
  }

  private shot(): void {
    if (this.kick <= 0) return;
    SetGameplayCamRelativePitch(GetGameplayCamRelativePitch() + this.kick, 0.3);
  }
}

const recoil = new Recoil();
recoil.apply();
onWeapons(() => recoil.apply());
onCache("weapon", (weapon) => recoil.held(weapon));

/** Player melee weapon damage: the listed weapons hit with the panel's percent, GTA's own while off. */
class MeleeDamage {
  private applied: number[] = [];

  apply(): void {
    this.reset();
    const w = content.weapons;
    if (!w.meleeDamage) return;
    this.applied = w.meleeWeapons.map((name) => GetHashKey(name));
    for (const hash of this.applied)
      SetWeaponDamageModifier(hash, w.meleeDamagePercent / 100);
  }

  reset(): void {
    for (const hash of this.applied) SetWeaponDamageModifier(hash, 1);
    this.applied = [];
  }
}

const melee = new MeleeDamage();
melee.apply();
onWeapons(() => melee.apply());
onStop(() => melee.reset());
